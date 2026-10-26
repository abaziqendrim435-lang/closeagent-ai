"""CloseAgent pipeline: your own lead list (CSV) → optional Hunter.io lookup → OpenAI drafts.

This version does NOT scrape the web. Users bring their own leads (CSV export
from their CRM, a list they collected with consent, etc.) and CloseAgent writes
personalized outreach drafts for them.
"""

from __future__ import annotations

import csv
import io
import json
import re
from collections.abc import Callable
from typing import Any
from urllib.parse import urlparse

import requests
from openai import (
    APIConnectionError,
    APITimeoutError,
    AuthenticationError,
    BadRequestError,
    OpenAI,
    OpenAIError,
    RateLimitError,
)

HUNTER_FINDER_URL = "https://api.hunter.io/v2/email-finder"
HUNTER_DOMAIN_URL = "https://api.hunter.io/v2/domain-search"
HUNTER_VERIFY_URL = "https://api.hunter.io/v2/email-verifier"

MAX_LEADS_PER_RUN = 50
DRAFT_BATCH_SIZE = 5
REQUEST_TIMEOUT = 30
OPENAI_MODEL = "gpt-4o-mini"

# Accepted CSV header aliases → internal field name.
COLUMN_ALIASES: dict[str, tuple[str, ...]] = {
    "name": ("name", "full_name", "fullname", "contact", "contact_name"),
    "first_name": ("first_name", "firstname", "first"),
    "last_name": ("last_name", "lastname", "last", "surname"),
    "company": ("company", "company_name", "organization", "organisation", "business"),
    "email": ("email", "target_email", "email_address", "work_email"),
    "website": ("website", "url", "domain", "company_website", "site"),
    "title": ("title", "job_title", "position", "role"),
    "notes": ("notes", "note", "context", "description", "about", "snippet"),
}

CSV_TEMPLATE_HEADERS = ["name", "company", "email", "website", "title", "notes"]


class PipelineError(Exception):
    """User-facing pipeline failure."""


def _json_or_text(response: requests.Response) -> Any:
    try:
        return response.json()
    except ValueError:
        return (response.text or "").strip()


def _hunter_error_message(payload: Any, fallback: str) -> str:
    if isinstance(payload, dict):
        errors = payload.get("errors")
        if isinstance(errors, list) and errors:
            first = errors[0]
            if isinstance(first, dict):
                return str(first.get("details") or first.get("id") or fallback)
        if payload.get("message"):
            return str(payload["message"])
    return fallback



# ── CSV import ───────────────────────────────────────────────────────────────
def _normalize_header(header: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", header.strip().lower()).strip("_")


def _root_domain(url: str) -> str:
    raw = (url or "").strip()
    if not raw:
        return ""
    if "://" not in raw:
        raw = f"https://{raw}"
    host = urlparse(raw).netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    return host


def _split_name(full_name: str) -> tuple[str, str]:
    parts = [p for p in re.split(r"\s+", full_name.strip()) if p]
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], parts[-1]


def csv_template_bytes() -> bytes:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(CSV_TEMPLATE_HEADERS)
    writer.writerow(
        [
            "Jane Doe",
            "Example Studio",
            "jane@example.com",
            "example.com",
            "Founder",
            "Small design agency, recently launched a new pricing page",
        ]
    )
    return buffer.getvalue().encode("utf-8")


def parse_leads_csv(data: bytes, limit: int = MAX_LEADS_PER_RUN) -> list[dict[str, str]]:
    """Parse a user-provided CSV into lead dicts. Flexible about header names."""
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = data.decode("latin-1")
    if not text.strip():
        raise PipelineError("The CSV file is empty.")

    try:
        dialect = csv.Sniffer().sniff(text[:4096], delimiters=",;\t")
    except csv.Error:
        dialect = csv.excel
    reader = csv.DictReader(io.StringIO(text), dialect=dialect)
    if not reader.fieldnames:
        raise PipelineError("Could not read CSV headers. The first row must contain column names.")

    header_map: dict[str, str] = {}
    for raw in reader.fieldnames:
        norm = _normalize_header(raw or "")
        for field, aliases in COLUMN_ALIASES.items():
            if norm in aliases and field not in header_map.values():
                header_map[raw] = field
                break

    if not {"company", "email", "website", "name"} & set(header_map.values()):
        raise PipelineError(
            "CSV needs at least one of these columns: name, company, email, website. "
            "Download the template to see the expected format."
        )

    leads: list[dict[str, str]] = []
    for row in reader:
        values = {field: (row.get(raw) or "").strip() for raw, field in header_map.items()}
        if not any(values.values()):
            continue

        first = values.get("first_name", "")
        last = values.get("last_name", "")
        name = values.get("name", "") or f"{first} {last}".strip()
        if name and not (first or last):
            first, last = _split_name(name)

        email = values.get("email", "")
        website = values.get("website", "")
        domain = _root_domain(website)
        if not domain and "@" in email:
            domain = email.split("@", 1)[1].lower()
        company = values.get("company", "") or (domain.split(".")[0].title() if domain else "")

        if not (company or name):
            continue

        leads.append(
            {
                "name": name or company,
                "first_name": first,
                "last_name": last,
                "company": company,
                "email": email,
                "email_status": "provided" if email else "missing",
                "email_score": "",
                "domain": domain,
                "url": website,
                "title": values.get("title", ""),
                "notes": values.get("notes", ""),
                "pain_point": "",
                "draft": "",
            }
        )
        if len(leads) >= limit:
            break

    if not leads:
        raise PipelineError("No usable rows found in the CSV.")
    return leads


# ── Hunter.io (optional) ─────────────────────────────────────────────────────
def _hunter_get(url: str, params: dict[str, Any]) -> dict[str, Any]:
    try:
        response = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
    except requests.Timeout as exc:
        raise PipelineError("Hunter.io request timed out. Please try again.") from exc
    except requests.RequestException as exc:
        raise PipelineError(f"Could not reach Hunter.io: {exc}") from exc

    payload = _json_or_text(response)
    if response.status_code in {401, 403}:
        raise PipelineError(
            "Invalid Hunter.io API key. Check the key in the settings panel "
            "(or `.streamlit/secrets.toml` / `.env`)."
        )
    if response.status_code == 429:
        raise PipelineError(
            "Hunter.io rate limit or quota exceeded. Wait a moment or check your plan."
        )
    if response.status_code >= 400:
        raise PipelineError(
            _hunter_error_message(payload, f"Hunter.io error ({response.status_code}).")
        )
    if not isinstance(payload, dict):
        raise PipelineError("Hunter.io returned an unexpected response.")
    return payload


def _apply_finder_result(lead: dict[str, str], data: dict[str, Any]) -> None:
    email = str(data.get("email") or "").strip()
    score = data.get("score")
    verification = data.get("verification") if isinstance(data.get("verification"), dict) else {}
    status = str(verification.get("status") or "").strip()
    if email:
        lead["email"] = email
        lead["email_score"] = str(score if score is not None else "")
        lead["email_status"] = status or "found"
    if not lead.get("name") or lead["name"] == lead["company"]:
        first = str(data.get("first_name") or "").strip()
        last = str(data.get("last_name") or "").strip()
        full = f"{first} {last}".strip()
        if full:
            lead["name"] = full
            lead["first_name"] = first
            lead["last_name"] = last
    position = str(data.get("position") or "").strip()
    if position and not lead.get("title"):
        lead["title"] = position
    company = str(data.get("company") or "").strip()
    if company:
        lead["company"] = company


def _is_fatal_hunter_error(exc: PipelineError) -> bool:
    text = str(exc).lower()
    return any(
        token in text
        for token in ("invalid hunter.io", "rate limit", "quota", "could not reach hunter")
    )


def find_email_with_hunter(api_key: str, lead: dict[str, str]) -> dict[str, str]:
    """Find and (when possible) verify a work email for one lead."""
    first = lead.get("first_name") or ""
    last = lead.get("last_name") or ""
    domain = lead.get("domain") or ""
    company = lead.get("company") or ""

    try:
        if first and last and (domain or company):
            params: dict[str, Any] = {
                "api_key": api_key,
                "first_name": first,
                "last_name": last,
            }
            if domain:
                params["domain"] = domain
            else:
                params["company"] = company
            payload = _hunter_get(HUNTER_FINDER_URL, params)
            data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
            _apply_finder_result(lead, data)

        if not lead.get("email") and domain:
            payload = _hunter_get(
                HUNTER_DOMAIN_URL,
                {
                    "api_key": api_key,
                    "domain": domain,
                    "type": "personal",
                    "seniority": "executive,senior",
                    "limit": 3,
                },
            )
            data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
            emails = data.get("emails") if isinstance(data.get("emails"), list) else []
            org = str(data.get("organization") or "").strip()
            if org:
                lead["company"] = org
            picked = None
            for item in emails:
                if isinstance(item, dict) and item.get("value"):
                    picked = item
                    break
            if picked:
                first = str(picked.get("first_name") or "").strip()
                last = str(picked.get("last_name") or "").strip()
                full = f"{first} {last}".strip()
                lead["email"] = str(picked.get("value")).strip()
                lead["email_score"] = str(picked.get("confidence") or "")
                verification = (
                    picked.get("verification")
                    if isinstance(picked.get("verification"), dict)
                    else {}
                )
                lead["email_status"] = str(verification.get("status") or "found")
                if full:
                    lead["name"] = full
                    lead["first_name"] = first
                    lead["last_name"] = last
                if picked.get("position"):
                    lead["title"] = str(picked["position"])

        if lead.get("email"):
            try:
                verify = _hunter_get(
                    HUNTER_VERIFY_URL,
                    {"api_key": api_key, "email": lead["email"]},
                )
                vdata = verify.get("data") if isinstance(verify.get("data"), dict) else {}
                status = str(vdata.get("status") or lead.get("email_status") or "found")
                score = vdata.get("score")
                lead["email_status"] = status
                if score is not None:
                    lead["email_score"] = str(score)
            except PipelineError as exc:
                if _is_fatal_hunter_error(exc):
                    raise
        else:
            lead["email"] = "not found"
            lead["email_status"] = "not_found"
    except PipelineError as exc:
        if _is_fatal_hunter_error(exc):
            raise
        if not lead.get("email"):
            lead["email"] = "not found"
            lead["email_status"] = "not_found"

    return lead



def enrich_missing_emails(
    api_key: str,
    leads: list[dict[str, str]],
    on_progress: Callable[[str], None] | None = None,
) -> list[dict[str, str]]:
    """Optional: look up work emails with Hunter.io only for leads without one."""
    for i, lead in enumerate(leads, start=1):
        if lead.get("email"):
            continue
        if not lead.get("domain"):
            lead["email_status"] = "missing"
            continue
        if on_progress:
            on_progress(f"Hunter.io lookup {i}/{len(leads)}: {lead.get('company') or lead['domain']}")
        find_email_with_hunter(api_key, lead)
    return leads


# ── OpenAI drafting ──────────────────────────────────────────────────────────
def extract_json_payload(raw: str) -> dict[str, Any]:
    text = raw.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if fence:
        text = fence.group(1).strip()
    return json.loads(text)


def _build_email_prompt(offer: dict[str, str], leads: list[dict[str, str]]) -> str:
    lead_lines = []
    for i, lead in enumerate(leads, start=1):
        lead_lines.append(
            "\n".join(
                [
                    f"Target {i}:",
                    f"- Name: {lead.get('name') or 'Unknown'}",
                    f"- Company: {lead.get('company') or 'Unknown'}",
                    f"- Title: {lead.get('title') or 'Unknown'}",
                    f"- Website: {lead.get('url') or lead.get('domain') or 'n/a'}",
                    f"- Notes from the sender: {lead.get('notes') or 'n/a'}",
                ]
            )
        )
    leads_block = "\n\n".join(lead_lines)

    language = offer.get("language") or "the language that best fits each company"
    cta = offer.get("cta") or "a short reply if they are interested"
    sender = offer.get("sender_name") or "the sender"
    sender_company = offer.get("sender_company") or ""
    footer = offer.get("footer") or ""

    return f"""You are an expert B2B copywriter writing first-touch outreach emails.

The SENDER and their offer:
- Sender name: {sender}
- Sender company: {sender_company or 'n/a'}
- What they offer: {offer.get('product') or 'n/a'}
- Desired call to action: {cta}

Targets (provided by the sender from their own list):

{leads_block}

For EACH target:
1. Write ONE sentence on why this specific person/company is a good fit for the sender's
   offer (their audience, niche, what they do). Base it only on the facts above. If facts
   are thin, keep it general and honest — do not invent specific events, numbers or quotes.
2. Write a short, personalized email (70–120 words) with a "Subject:" line.

Rules:
- Subject: 3–7 words, specific to the recipient, sounds like a person wrote it.
  No hype words ("Boost", "Unlock", "Supercharge", "Game-changer", "Revolutionize").
- First sentence must reference a concrete detail from the facts above (their niche,
  audience, a topic they cover). Never start with "I loved", "I hope", "I came across",
  "Just reaching out" or similar filler.
- Explain the offer in plain words in 1–2 sentences, focused on what's in it for THEM.
- Be honest: never claim results, clients or numbers that are not given above.
- Never invent people, emails or companies.
- One clear call to action: {cta}
- Sign off as {sender}{(' — ' + sender_company) if sender_company else ''}.
- Always end with a polite one-line opt-out, e.g. "If this isn't relevant, just reply 'no' and I won't follow up."
- Plain, friendly, human tone. No exclamation marks in the first line.
- Write in {language}.

Return ONLY valid JSON with this exact shape:
{{
  "leads": [
    {{"pain_point": "one sentence", "draft": "Subject: ...\\n\\nEmail body..."}}
  ]
}}
Return exactly one object per target, in the same order."""


def _draft_batch(
    client: OpenAI,
    offer: dict[str, str],
    batch: list[dict[str, str]],
) -> None:
    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        temperature=0.7,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You write honest, personalized B2B outreach emails. "
                    "Always respond with valid JSON matching the requested schema."
                ),
            },
            {"role": "user", "content": _build_email_prompt(offer, batch)},
        ],
    )
    if not response.choices:
        raise PipelineError("OpenAI returned no choices.")
    message = response.choices[0].message
    refusal = getattr(message, "refusal", None)
    if refusal:
        raise PipelineError(f"OpenAI refused the request: {refusal}")
    if not message.content:
        raise PipelineError("OpenAI returned an empty response.")

    drafted = extract_json_payload(message.content).get("leads")
    if not isinstance(drafted, list):
        raise PipelineError("OpenAI response did not include a 'leads' array.")

    for lead, item in zip(batch, drafted):
        if not isinstance(item, dict):
            continue
        lead["pain_point"] = str(item.get("pain_point") or "").strip()
        lead["draft"] = str(item.get("draft") or "").strip()


def draft_emails_with_openai(
    api_key: str,
    offer: dict[str, str],
    leads: list[dict[str, str]],
    on_progress: Callable[[str], None] | None = None,
) -> list[dict[str, str]]:
    client = OpenAI(api_key=api_key.strip())
    total = len(leads)
    for start in range(0, total, DRAFT_BATCH_SIZE):
        batch = leads[start : start + DRAFT_BATCH_SIZE]
        if on_progress:
            on_progress(f"Writing drafts {start + 1}–{start + len(batch)} of {total}…")
        _draft_batch(client, offer, batch)
    missing = [lead.get("name") or lead.get("company") for lead in leads if not lead.get("draft")]
    if missing and len(missing) == total:
        raise PipelineError("OpenAI did not return any drafts. Please try again.")
    return leads


def friendly_error(exc: Exception) -> str:
    if isinstance(exc, AuthenticationError):
        return "Invalid OpenAI API key. Double-check it (it should start with `sk-`) and try again."
    if isinstance(exc, RateLimitError):
        return "OpenAI rate limit or quota exceeded. Check your billing/usage limits, then retry."
    if isinstance(exc, APITimeoutError):
        return "OpenAI request timed out. Please try again."
    if isinstance(exc, APIConnectionError):
        return "Could not reach OpenAI. Check your internet connection and try again."
    if isinstance(exc, BadRequestError):
        return f"OpenAI rejected the request: {exc}"
    if isinstance(exc, OpenAIError):
        return f"OpenAI service error: {exc}"
    if isinstance(exc, json.JSONDecodeError):
        return "OpenAI returned data that could not be parsed as JSON. Please try again."
    if isinstance(exc, (ValueError, PipelineError)):
        return str(exc)
    return f"Unexpected error: {exc}"
