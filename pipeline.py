"""CloseAgent SDR pipeline: Apify search → Hunter.io emails → OpenAI drafts."""

from __future__ import annotations

import json
import re
import time
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

DEFAULT_APIFY_ACTOR = "apify~google-search-scraper"
APIFY_API = "https://api.apify.com/v2"
HUNTER_FINDER_URL = "https://api.hunter.io/v2/email-finder"
HUNTER_DOMAIN_URL = "https://api.hunter.io/v2/domain-search"
HUNTER_VERIFY_URL = "https://api.hunter.io/v2/email-verifier"

MAX_LEADS = 3
MAX_EMAIL_TARGETS = 10
REQUEST_TIMEOUT = 30
APIFY_POLL_SECONDS = 3
APIFY_MAX_WAIT_SECONDS = 180
APIFY_RESULTS_PER_PAGE = 10

SKIP_DOMAINS = frozenset(
    {
        "linkedin.com",
        "facebook.com",
        "twitter.com",
        "x.com",
        "youtube.com",
        "wikipedia.org",
        "instagram.com",
        "tiktok.com",
        "pinterest.com",
        "reddit.com",
        "medium.com",
        "quora.com",
        "amazon.com",
        "google.com",
        "apple.com",
        "microsoft.com",
        "bing.com",
        "yahoo.com",
        "ycombinator.com",
        "crunchbase.com",
        "bloomberg.com",
        "techcrunch.com",
        "forbes.com",
        "nytimes.com",
        "wsj.com",
        "theguardian.com",
        "bbc.com",
        "cnn.com",
        "indeed.com",
        "glassdoor.com",
        "zoominfo.com",
        "g2.com",
        "capterra.com",
        "producthunt.com",
        "github.com",
        "stackoverflow.com",
        "wordpress.com",
        "blogspot.com",
        "substack.com",
    }
)

NAME_TITLE_RE = re.compile(
    r"^([A-Z][a-z]+(?:\s[A-Z][a-z'.-]+){1,2})\s*[-–—|:•]\s*(.+)$"
)


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


def _apify_actor_id(raw: str | None) -> str:
    actor = (raw or DEFAULT_APIFY_ACTOR).strip() or DEFAULT_APIFY_ACTOR
    return actor.replace("/", "~")


def _raise_apify_http(response: requests.Response, payload: Any) -> None:
    if response.status_code in {401, 403}:
        raise PipelineError(
            "Invalid Apify API token. Check the token in Mission Control "
            "(or `.streamlit/secrets.toml` / `.env`)."
        )
    if response.status_code == 402:
        raise PipelineError(
            "Apify account is out of credits. Top up at console.apify.com, then retry."
        )
    if response.status_code == 404:
        raise PipelineError(
            "Apify actor not found. Set APIFY_ACTOR_ID to a valid actor "
            "(default is apify/google-search-scraper)."
        )
    if response.status_code >= 400:
        detail = (
            payload.get("error", {}).get("message")
            if isinstance(payload, dict)
            else payload
        )
        raise PipelineError(f"Apify API error ({response.status_code}): {detail}")


def _apify_request(
    method: str,
    url: str,
    token: str,
    *,
    json_body: dict[str, Any] | None = None,
    timeout: int = REQUEST_TIMEOUT,
) -> Any:
    try:
        kwargs: dict[str, Any] = {"params": {"token": token}, "timeout": timeout}
        if json_body is not None:
            kwargs["json"] = json_body
        response = requests.request(method, url, **kwargs)
    except requests.Timeout as exc:
        raise PipelineError(
            "Apify timed out while scanning the web. Try a narrower audience."
        ) from exc
    except requests.RequestException as exc:
        raise PipelineError(f"Could not reach Apify: {exc}") from exc

    payload = _json_or_text(response)
    _raise_apify_http(response, payload)
    return payload


def _start_apify_run(token: str, actor_id: str, target_audience: str) -> dict[str, Any]:
    payload = _apify_request(
        "POST",
        f"{APIFY_API}/acts/{actor_id}/runs",
        token,
        json_body={
            "queries": (
                f"{target_audience} founder CEO official website\n"
                f"{target_audience} company"
            ),
            "resultsPerPage": APIFY_RESULTS_PER_PAGE,
            "maxPagesPerQuery": 1,
            "maximumLeadsEnrichmentRecords": 0,
            "languageCode": "en",
        },
    )
    data = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(data, dict) or not data.get("id"):
        raise PipelineError("Apify started a run but did not return a run id.")
    return data


def _wait_for_apify_run(
    token: str,
    run_id: str,
    on_progress: Callable[[str], None] | None = None,
) -> dict[str, Any]:
    deadline = time.monotonic() + APIFY_MAX_WAIT_SECONDS
    last_status = "RUNNING"
    while time.monotonic() < deadline:
        payload = _apify_request("GET", f"{APIFY_API}/actor-runs/{run_id}", token)
        data = payload.get("data") if isinstance(payload, dict) else None
        if not isinstance(data, dict):
            raise PipelineError("Apify returned an unexpected run status payload.")
        status = str(data.get("status") or "").upper()
        last_status = status or last_status
        if on_progress:
            on_progress(f"Apify run {run_id} is {last_status.lower()}…")
        if status == "SUCCEEDED":
            return data
        if status in {"FAILED", "ABORTED", "TIMED-OUT", "TIMING-OUT"}:
            raise PipelineError(f"Apify run {run_id} ended with status {status}.")
        time.sleep(APIFY_POLL_SECONDS)
    raise PipelineError(
        f"Apify run {run_id} is still {last_status.lower()} after "
        f"{APIFY_MAX_WAIT_SECONDS}s. Check the run in console.apify.com."
    )


def _fetch_apify_dataset(token: str, dataset_id: str) -> list[Any]:
    payload = _apify_request(
        "GET",
        f"{APIFY_API}/datasets/{dataset_id}/items",
        token,
        timeout=60,
    )
    if not isinstance(payload, list):
        raise PipelineError("Apify dataset did not return a JSON list of items.")
    return payload


def _row_from_apify_item(item: dict[str, Any]) -> dict[str, str] | None:
    url = str(
        item.get("url")
        or item.get("website")
        or item.get("companyWebsite")
        or item.get("linkedinUrl")
        or ""
    ).strip()
    title = str(
        item.get("title")
        or item.get("fullName")
        or item.get("name")
        or item.get("companyName")
        or ""
    ).strip()
    description = str(
        item.get("description")
        or item.get("headline")
        or item.get("snippet")
        or item.get("bio")
        or ""
    ).strip()
    if not (url and title):
        return None
    return {"title": title, "url": url, "description": description}


def normalize_apify_items(items: list[Any]) -> list[dict[str, str]]:
    """Flatten Google SERP pages or pass through already-flat actor rows."""
    organic: list[dict[str, str]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        nested = item.get("organicResults")
        if isinstance(nested, list):
            for row in nested:
                if isinstance(row, dict):
                    parsed = _row_from_apify_item(row)
                    if parsed:
                        organic.append(parsed)
            continue
        parsed = _row_from_apify_item(item)
        if parsed:
            organic.append(parsed)
    return organic


def scrape_with_apify(
    token: str,
    target_audience: str,
    actor_id: str | None = None,
    on_progress: Callable[[str], None] | None = None,
) -> list[dict[str, str]]:
    """Start an Apify actor run, poll until it finishes, then return dataset rows."""
    actor = _apify_actor_id(actor_id)
    run = _start_apify_run(token, actor, target_audience)
    run_id = str(run["id"])
    dataset_id = str(run.get("defaultDatasetId") or "")
    if on_progress:
        on_progress(f"Hunt started. Apify run id: {run_id}. Collecting results…")

    finished = _wait_for_apify_run(token, run_id, on_progress=on_progress)
    dataset_id = str(finished.get("defaultDatasetId") or dataset_id)
    if not dataset_id:
        raise PipelineError(f"Apify run {run_id} finished without a dataset id.")

    items = _fetch_apify_dataset(token, dataset_id)
    organic = normalize_apify_items(items)
    if not organic:
        raise PipelineError(
            "Apify finished but returned no search results for that audience. "
            "Try a more specific ICP."
        )
    return organic


def _root_domain(url: str) -> str:
    host = urlparse(url).netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    return host


def _is_skipped_domain(domain: str) -> bool:
    if not domain:
        return True
    return any(domain == skip or domain.endswith(f".{skip}") for skip in SKIP_DOMAINS)


def _split_name(full_name: str) -> tuple[str, str]:
    parts = [p for p in re.split(r"\s+", full_name.strip()) if p]
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], parts[-1]


def extract_lead_candidates(organic: list[dict[str, str]]) -> list[dict[str, str]]:
    """Turn SERP rows into unique company/person candidates."""
    candidates: list[dict[str, str]] = []
    seen_domains: set[str] = set()

    for row in organic:
        domain = _root_domain(row["url"])
        if _is_skipped_domain(domain) or domain in seen_domains:
            continue

        name = ""
        title_role = ""
        company = ""
        match = NAME_TITLE_RE.match(row["title"])
        if match:
            maybe_name, rest = match.group(1).strip(), match.group(2).strip()
            if " " in maybe_name:
                name = maybe_name
                title_role = rest
                at_split = re.split(r"\bat\b", rest, maxsplit=1, flags=re.I)
                if len(at_split) == 2:
                    title_role = at_split[0].strip(" -–|")
                    company = at_split[1].strip(" -–|")

        if not company:
            company = re.split(r"\s[-–—|:]\s", row["title"], maxsplit=1)[0].strip()
            company = re.sub(r"[\s\-–—|:]+$", "", company)
            company = re.sub(
                r"\s*(official site|home|homepage)$", "", company, flags=re.I
            ).strip()

        first_name, last_name = _split_name(name)
        seen_domains.add(domain)
        candidates.append(
            {
                "name": name or company,
                "first_name": first_name,
                "last_name": last_name,
                "company": company or domain.split(".")[0].title(),
                "domain": domain,
                "title": title_role,
                "snippet": row["description"],
                "url": row["url"],
                "source_url": row["url"],
                "email": "",
                "email_score": "",
                "email_status": "pending",
                "pain_point": row["description"] or f"Growth and outbound efficiency at {company or domain}.",
                "draft": "",
            }
        )
        if len(candidates) >= MAX_LEADS * 2:
            break

    if not candidates:
        raise PipelineError(
            "Could not extract company websites from Apify results. "
            "Try an audience that names a niche, city, or role."
        )
    return candidates[: MAX_LEADS * 2]


def targets_from_apify(
    organic: list[dict[str, str]],
    limit: int = MAX_EMAIL_TARGETS,
) -> list[dict[str, str]]:
    """Map Apify Title / URL / Snippet rows into draft targets without Hunter.io."""
    targets: list[dict[str, str]] = []
    for row in organic:
        title = (row.get("title") or "").strip()
        url = (row.get("url") or "").strip()
        snippet = (row.get("description") or "").strip()
        if not title or not url:
            continue
        domain = _root_domain(url)
        company = re.split(r"\s[-–—|:]\s", title, maxsplit=1)[0].strip()
        company = re.sub(r"[\s\-–—|:]+$", "", company)
        company = re.sub(
            r"\s*(official site|home|homepage)$", "", company, flags=re.I
        ).strip() or (domain.split(".")[0].title() if domain else title)
        targets.append(
            {
                "name": company,
                "company": company,
                "title": title,
                "url": url,
                "source_url": url,
                "snippet": snippet,
                "description": snippet,
                "domain": domain,
                "email": "",
                "email_status": "hunter_disabled",
                "pain_point": snippet or f"Growth and outbound at {company}.",
                "draft": "",
            }
        )
        if len(targets) >= limit:
            break
    if not targets:
        raise PipelineError(
            "Apify returned no Title/URL rows to send to OpenAI. Try a more specific ICP."
        )
    return targets


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
            "Invalid Hunter.io API key. Check the key in Mission Control "
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


def enrich_leads_with_hunter(api_key: str, candidates: list[dict[str, str]]) -> list[dict[str, str]]:
    enriched: list[dict[str, str]] = []
    for candidate in candidates:
        try:
            lead = find_email_with_hunter(api_key, dict(candidate))
        except PipelineError:
            if enriched:
                break
            raise
        enriched.append(lead)
        found = [item for item in enriched if item.get("email") and item["email"] != "not found"]
        if len(found) >= MAX_LEADS:
            break

    preferred = [item for item in enriched if item.get("email") and item["email"] != "not found"]
    if preferred:
        return preferred[:MAX_LEADS]
    if enriched:
        return enriched[:MAX_LEADS]
    raise PipelineError("Hunter.io did not return any usable contacts for these companies.")


def extract_json_payload(raw: str) -> dict[str, Any]:
    text = raw.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if fence:
        text = fence.group(1).strip()
    return json.loads(text)


def _build_email_prompt(target_audience: str, leads: list[dict[str, str]]) -> str:
    lead_lines = []
    for i, lead in enumerate(leads, start=1):
        lead_lines.append(
            "\n".join(
                [
                    f"Target {i}:",
                    f"- Name: {lead.get('name') or 'Unknown'}",
                    f"- Company: {lead.get('company') or 'Unknown'}",
                    f"- Title: {lead.get('title') or 'Unknown'}",
                    f"- Email: {lead.get('email') or 'not found'}",
                    f"- Domain: {lead.get('domain') or ''}",
                    f"- URL: {lead.get('url') or lead.get('source_url') or ''}",
                    f"- Snippet: {lead.get('snippet') or lead.get('description') or 'n/a'}",
                ]
            )
        )
    leads_block = "\n\n".join(lead_lines)
    return f"""You are CloseAgent.ai, an elite Autonomous Sales CEO / AI SDR.

Target audience for today's mission:
{target_audience}

These are REAL companies discovered via web search (Apify), with work emails found
via Hunter.io. Use the provided name, company, and email. Do not invent people,
emails, or companies that are not in the facts below.

{leads_block}

For EACH target:
1. Infer a sharp, realistic pain point (1 sentence) from Title + URL + Snippet.
2. Write a hyper-personalized, attention-grabbing cold sales email addressed to
   the named contact when a real person name is provided. If the email is
   "not found", still write the draft for the company.

Email craft rules:
- Open with a specific hook tied to a concrete detail from the Title or Snippet. Never use generic openers ("I hope this email finds you well", "Just reaching out").
- Make the reader feel the email could only have been written for THAT company.
- Keep it short (90–140 words), punchy, and easy to scan.
- Write in the language that best fits the target audience / company.

CRITICAL — use a "No-Touch" sales strategy for every email:
- Do NOT ask for a 15-minute Zoom meeting (or any live call/meeting).
- State clearly: "I have built an autonomous AI system that finds leads and writes hyper-personalized emails just like this one."
- Include a call-to-action asking them to watch a 2-minute Loom demo, with this exact placeholder link: [Insert Loom Demo Link]
- Include a direct purchase option saying they can hire this AI system for their company for $1500/month, with this exact placeholder link: [Insert Stripe Payment Link]
- Keep the email personalized to the company and pain point, while following the No-Touch structure above.

Return ONLY valid JSON (no markdown fences) with this exact shape:
{{
  "leads": [
    {{
      "name": "contact or company name from the input",
      "company": "company name",
      "pain_point": "Specific, realistic pain point (1 sentence)",
      "draft": "Full cold outreach email including Subject: line"
    }}
  ]
}}
Return one object per input target, in the same order.
"""


def draft_emails_with_openai(
    api_key: str,
    target_audience: str,
    leads: list[dict[str, str]],
) -> list[dict[str, str]]:
    client = OpenAI(api_key=api_key.strip())
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.7,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a precise B2B sales intelligence engine. "
                    "Write hyper-personalized cold emails using the provided contact, "
                    "company, Hunter.io email, Title, URL, and Snippet. "
                    "Always respond with valid JSON matching the requested schema. "
                    "Never invent emails or new companies."
                ),
            },
            {
                "role": "user",
                "content": _build_email_prompt(target_audience, leads),
            },
        ],
    )
    if not response.choices:
        raise PipelineError("OpenAI returned no choices.")
    message = response.choices[0].message
    refusal = getattr(message, "refusal", None)
    if refusal:
        raise PipelineError(f"OpenAI refused the request: {refusal}")
    content = message.content
    if not content:
        raise PipelineError("OpenAI returned an empty response.")

    payload = extract_json_payload(content)
    drafted = payload.get("leads")
    if not isinstance(drafted, list):
        raise PipelineError("OpenAI response did not include a 'leads' array.")

    for index, lead in enumerate(leads):
        if index >= len(drafted) or not isinstance(drafted[index], dict):
            continue
        item = drafted[index]
        pain = str(item.get("pain_point") or item.get("painPoint") or "").strip()
        draft = str(item.get("draft") or "").strip()
        company = str(item.get("company") or "").strip()
        returned_name = str(item.get("name") or "").strip()
        if pain:
            lead["pain_point"] = pain
        if draft:
            lead["draft"] = draft
        if company:
            lead["company"] = company
        hunter_person = f"{lead.get('first_name', '')} {lead.get('last_name', '')}".strip()
        if hunter_person:
            lead["name"] = hunter_person
        elif returned_name:
            lead["name"] = returned_name
        elif company and (not lead.get("name") or lead["name"] == lead.get("company")):
            lead["name"] = company
        if not lead.get("draft"):
            raise PipelineError("OpenAI did not return a draft for every lead.")
    return leads


def friendly_openai_error(exc: Exception) -> str:
    if isinstance(exc, AuthenticationError):
        return (
            "Invalid OpenAI API key. Double-check the key in Mission Control "
            "(it should start with `sk-`) and try again."
        )
    if isinstance(exc, RateLimitError):
        return (
            "OpenAI rate limit or quota exceeded. Wait a moment or check your "
            "billing/usage limits, then retry."
        )
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
    return f"Unexpected error while running the agent: {exc}"
