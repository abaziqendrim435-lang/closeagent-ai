"""CloseAgent.ai — AI outreach copilot
Upload your own lead list → (optional) Hunter.io email lookup → OpenAI writes
personalized first-touch emails you review and send yourself.
"""

from __future__ import annotations

import csv
import html
import io
import os
from pathlib import Path
from typing import Any

import streamlit as st

try:
    from pipeline import (
        MAX_LEADS_PER_RUN,
        PipelineError,
        csv_template_bytes,
        draft_emails_with_openai,
        enrich_missing_emails,
        friendly_error,
        parse_leads_csv,
    )
except ImportError as exc:  # pragma: no cover - environment setup guidance
    raise SystemExit(
        "Missing dependency. Activate the project virtualenv, then install:\n"
        "  source venv/bin/activate\n"
        "  pip install -r requirements.txt\n\n"
        "Run the app with:\n"
        "  streamlit run app.py"
    ) from exc

# ── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="CloseAgent.ai — AI Outreach Copilot",
    page_icon="◈",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ── Custom CSS ───────────────────────────────────────────────────────────────
def inject_styles() -> None:
    st.markdown(
        """
<style>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

:root {
  --bg-deep: #06060f;
  --bg-panel: #0c0c1a;
  --bg-card: rgba(16, 16, 36, 0.85);
  --border: rgba(120, 90, 255, 0.22);
  --border-bright: rgba(100, 200, 255, 0.45);
  --neon-blue: #3de0ff;
  --neon-purple: #9b6dff;
  --neon-pink: #ff5ec8;
  --text: #e8eaf6;
  --text-muted: #8b90b5;
  --glow-blue: 0 0 24px rgba(61, 224, 255, 0.35);
  --glow-purple: 0 0 28px rgba(155, 109, 255, 0.4);
}

html, body, [data-testid="stAppViewContainer"] {
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(155, 109, 255, 0.18), transparent 55%),
    radial-gradient(900px 500px at 90% 0%, rgba(61, 224, 255, 0.12), transparent 50%),
    radial-gradient(800px 400px at 50% 100%, rgba(255, 94, 200, 0.06), transparent 55%),
    var(--bg-deep) !important;
  color: var(--text);
  font-family: 'Space Grotesk', sans-serif;
}

[data-testid="stHeader"] { background: transparent !important; }
[data-testid="stToolbar"] { display: none; }

/* Fully remove sidebar + its open/collapse controls */
[data-testid="stSidebar"],
[data-testid="stSidebarNav"],
[data-testid="stSidebarCollapsedControl"],
[data-testid="collapsedControl"],
button[kind="headerNoPadding"] {
  display: none !important;
  visibility: hidden !important;
  width: 0 !important;
  min-width: 0 !important;
  max-width: 0 !important;
  overflow: hidden !important;
}

section[data-testid="stSidebar"] {
  display: none !important;
}

[data-testid="stAppViewContainer"] {
  margin-left: 0 !important;
}

.ca-hero {
  text-align: center;
  padding: 0.5rem 0 1.75rem;
  animation: fadeUp 0.7s ease-out both;
}

.ca-brand {
  font-family: 'Orbitron', sans-serif;
  font-size: clamp(1.6rem, 3.5vw, 2.4rem);
  font-weight: 700;
  letter-spacing: 0.06em;
  background: linear-gradient(120deg, var(--neon-blue), var(--neon-purple), var(--neon-pink));
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: shimmer 6s linear infinite;
  margin: 0;
  line-height: 1.2;
}

.ca-tagline {
  margin-top: 0.55rem;
  color: var(--text-muted);
  font-size: 0.95rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 400;
}

.ca-divider {
  width: min(420px, 70%);
  height: 1px;
  margin: 1.25rem auto 0;
  background: linear-gradient(90deg, transparent, var(--neon-purple), var(--neon-blue), transparent);
  box-shadow: 0 0 12px rgba(155, 109, 255, 0.5);
}

.ca-command-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--neon-purple);
  margin-bottom: 1rem;
  text-shadow: 0 0 14px rgba(155, 109, 255, 0.45);
}

div[data-testid="stTextInput"] > div > div > input {
  background: rgba(6, 6, 16, 0.95) !important;
  border: 1px solid var(--border) !important;
  border-radius: 14px !important;
  color: var(--text) !important;
  font-size: 1.15rem !important;
  padding: 1rem 1.15rem !important;
  font-family: 'Space Grotesk', sans-serif !important;
  transition: border-color 0.3s ease, box-shadow 0.3s ease !important;
}

div[data-testid="stTextInput"] > div > div > input:focus {
  border-color: var(--neon-blue) !important;
  box-shadow: 0 0 0 1px rgba(61, 224, 255, 0.35), var(--glow-blue) !important;
}

div[data-testid="stTextInput"] label {
  font-size: 1.05rem !important;
  font-weight: 600 !important;
  color: var(--text) !important;
  letter-spacing: 0.02em;
}

div[data-testid="stButton"] > button[kind="primary"],
div[data-testid="stButton"] > button[data-testid="baseButton-primary"],
div[data-testid="stFormSubmitButton"] > button {
  width: 100%;
  background: linear-gradient(135deg, #1a8cff 0%, #7b4dff 45%, #c44dff 100%) !important;
  border: none !important;
  border-radius: 14px !important;
  color: #fff !important;
  font-family: 'Orbitron', sans-serif !important;
  font-size: 0.95rem !important;
  font-weight: 600 !important;
  letter-spacing: 0.08em !important;
  padding: 0.95rem 1.5rem !important;
  box-shadow: 0 0 30px rgba(123, 77, 255, 0.55), 0 0 60px rgba(61, 224, 255, 0.2) !important;
  transition: transform 0.25s ease, box-shadow 0.25s ease, filter 0.25s ease !important;
  animation: glowPulse 2.8s ease-in-out infinite;
}

div[data-testid="stButton"] > button[kind="primary"]:hover,
div[data-testid="stButton"] > button[data-testid="baseButton-primary"]:hover,
div[data-testid="stFormSubmitButton"] > button:hover {
  transform: translateY(-2px) scale(1.01) !important;
  filter: brightness(1.08);
  box-shadow: 0 0 40px rgba(123, 77, 255, 0.75), 0 0 80px rgba(61, 224, 255, 0.3) !important;
}

div[data-testid="stButton"] > button[kind="secondary"],
div[data-testid="stButton"] > button:not([kind="primary"]) {
  background: rgba(12, 12, 28, 0.9) !important;
  border: 1px solid rgba(61, 224, 255, 0.35) !important;
  border-radius: 10px !important;
  color: var(--neon-blue) !important;
  font-family: 'Space Grotesk', sans-serif !important;
  font-weight: 500 !important;
  font-size: 0.82rem !important;
  letter-spacing: 0.04em !important;
  transition: all 0.25s ease !important;
}

div[data-testid="stButton"] > button[kind="secondary"]:hover,
div[data-testid="stButton"] > button:not([kind="primary"]):hover {
  background: rgba(61, 224, 255, 0.1) !important;
  border-color: var(--neon-blue) !important;
  box-shadow: var(--glow-blue) !important;
  color: #fff !important;
}

.ca-sim-panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 1.5rem 1.6rem;
  margin: 0.5rem 0 1.5rem;
  animation: fadeUp 0.5s ease-out both;
}

.ca-sim-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--neon-blue);
  margin-bottom: 1.1rem;
}

.ca-step {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.7rem 0.9rem;
  margin-bottom: 0.45rem;
  border-radius: 12px;
  border: 1px solid transparent;
  transition: all 0.4s ease;
  opacity: 0.35;
}

.ca-step.active {
  opacity: 1;
  border-color: rgba(61, 224, 255, 0.35);
  background: rgba(61, 224, 255, 0.06);
  box-shadow: 0 0 20px rgba(61, 224, 255, 0.12);
}

.ca-step.done {
  opacity: 0.85;
  border-color: rgba(57, 255, 138, 0.25);
  background: rgba(57, 255, 138, 0.05);
}

.ca-step-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.ca-step.active .ca-step-icon {
  border-color: var(--neon-blue);
  box-shadow: 0 0 12px rgba(61, 224, 255, 0.5);
  animation: spinSoft 1.2s linear infinite;
}

.ca-step.done .ca-step-icon {
  border-color: #39ff8a;
  color: #39ff8a;
  box-shadow: 0 0 12px rgba(57, 255, 138, 0.4);
  animation: none;
}

.ca-step-text { font-size: 0.95rem; color: var(--text); }

.ca-leads-header {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.85rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--neon-blue);
  margin: 0.5rem 0 1rem;
  text-shadow: 0 0 12px rgba(61, 224, 255, 0.35);
  animation: fadeUp 0.55s ease-out both;
}

div[data-testid="stVerticalBlockBorderWrapper"] {
  background: var(--bg-card) !important;
  border: 1px solid var(--border) !important;
  border-radius: 14px !important;
  padding: 0.35rem 0.5rem !important;
  margin-bottom: 0.55rem !important;
  transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease !important;
}

div[data-testid="stVerticalBlockBorderWrapper"]:hover {
  border-color: var(--border-bright) !important;
  box-shadow: 0 0 24px rgba(155, 109, 255, 0.18) !important;
  transform: translateX(3px);
}

.ca-draft {
  background: linear-gradient(160deg, rgba(18, 18, 40, 0.95), rgba(10, 10, 24, 0.98));
  border: 1px solid rgba(155, 109, 255, 0.4);
  border-radius: 16px;
  padding: 1.4rem 1.5rem;
  margin: 0.75rem 0 1.25rem;
  box-shadow: var(--glow-purple);
  animation: fadeUp 0.4s ease-out both;
  white-space: pre-wrap;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.92rem;
  line-height: 1.55;
  color: #d6daf0;
}

.ca-draft-label {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--neon-pink);
  margin-bottom: 0.85rem;
}

.ca-live-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #39ff8a;
  margin-right: 6px;
  box-shadow: 0 0 10px #39ff8a;
  animation: pulse 1.6s ease-in-out infinite;
  vertical-align: middle;
}

#MainMenu, footer { visibility: hidden; }
.block-container {
  padding-top: 2rem !important;
  padding-bottom: 3rem !important;
  max-width: 1100px;
}

@keyframes shimmer {
  0% { background-position: 0% center; }
  100% { background-position: 200% center; }
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.85); }
}

@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 30px rgba(123, 77, 255, 0.55), 0 0 60px rgba(61, 224, 255, 0.2); }
  50% { box-shadow: 0 0 40px rgba(123, 77, 255, 0.8), 0 0 90px rgba(61, 224, 255, 0.35); }
}

@keyframes spinSoft {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
""",
        unsafe_allow_html=True,
    )


# ── Secrets (.env, st.secrets, then the API key fields) ──────────────────
def load_local_env() -> None:
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.is_file():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ.setdefault(key, value)


def secret_value(*names: str) -> str:
    secrets_map: dict[str, Any] = {}
    try:
        secrets_map = {str(k): v for k, v in dict(st.secrets).items()}
    except Exception:
        secrets_map = {}
    for name in names:
        env = os.environ.get(name, "").strip()
        if env:
            return env
        val = secrets_map.get(name, "")
        if val:
            return str(val).strip()
    return ""




# ── Session state ────────────────────────────────────────────────────────────
def init_state() -> None:
    defaults: dict[str, Any] = {
        "leads_processed": 0,
        "drafts_written": 0,
        "emails_found": 0,
        "leads": [],
        "api_error": None,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


# ── UI helpers ───────────────────────────────────────────────────────────────
def render_metrics() -> None:
    """Real counters for this session only — no invented numbers."""
    c1, c2, c3 = st.columns(3)
    c1.metric("Leads processed (this session)", st.session_state.leads_processed)
    c2.metric("Drafts written (this session)", st.session_state.drafts_written)
    c3.metric("Emails found via Hunter.io", st.session_state.emails_found)


def _csv_bytes(leads: list[dict[str, str]]) -> bytes:
    fields = [
        "name",
        "company",
        "email",
        "email_status",
        "domain",
        "title",
        "notes",
        "pain_point",
        "draft",
    ]
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    for lead in leads:
        writer.writerow({f: lead.get(f, "") for f in fields})
    return buffer.getvalue().encode("utf-8")


def render_drafts(leads: list[dict[str, str]]) -> None:
    for i, lead in enumerate(leads, start=1):
        name = lead.get("name") or lead.get("company") or f"Lead {i}"
        company = lead.get("company") or ""
        label = f"{i}. {name}" + (f" — {company}" if company and company != name else "")
        email = lead.get("email") or "no email"
        with st.expander(label, expanded=(i == 1)):
            st.caption(f"To: {email} · status: {lead.get('email_status') or '—'}")
            if lead.get("pain_point"):
                st.markdown(
                    f"<div style='color:#c8cce8;font-size:0.85rem;margin-bottom:0.6rem;'>"
                    f"<span style='color:#ff5ec8;font-size:0.65rem;letter-spacing:0.08em;"
                    f"text-transform:uppercase;'>Angle</span><br>"
                    f"{html.escape(lead['pain_point'])}</div>",
                    unsafe_allow_html=True,
                )
            if lead.get("draft"):
                st.code(lead["draft"], language=None, wrap_lines=True)
            else:
                st.warning("No draft was returned for this lead. Try running again.")


def run_agent(
    openai_key: str,
    hunter_key: str,
    offer: dict[str, str],
    leads: list[dict[str, str]],
) -> None:
    status = st.status("Working…", expanded=True)
    try:
        if hunter_key:
            missing = sum(1 for lead in leads if not lead.get("email"))
            if missing:
                status.write(f"Looking up {missing} missing email(s) with Hunter.io…")
                enrich_missing_emails(hunter_key, leads, on_progress=status.write)
        draft_emails_with_openai(openai_key, offer, leads, on_progress=status.write)
    except Exception as exc:  # noqa: BLE001
        status.update(label="Failed", state="error")
        st.session_state.api_error = friendly_error(exc)
        st.session_state.leads = []
        return

    status.update(label="Done", state="complete", expanded=False)
    found = sum(1 for lead in leads if lead.get("email_status") not in ("provided", "missing", "not_found"))
    st.session_state.leads = leads
    st.session_state.leads_processed += len(leads)
    st.session_state.drafts_written += sum(1 for lead in leads if lead.get("draft"))
    st.session_state.emails_found += found
    st.session_state.api_error = None


# ── App ──────────────────────────────────────────────────────────────────────
def main() -> None:
    load_local_env()
    inject_styles()
    init_state()

    saved_openai = secret_value("OPENAI_API_KEY", "openai_api_key")
    saved_hunter = secret_value("HUNTER_API_KEY", "hunter_api_key")

    st.markdown(
        """
<div class="ca-hero">
  <h1 class="ca-brand">CloseAgent.ai</h1>
  <div class="ca-tagline">AI Outreach Copilot</div>
  <div class="ca-divider"></div>
</div>
""",
        unsafe_allow_html=True,
    )

    render_metrics()

    st.markdown('<div class="ca-command-title">◈ 1 · Your leads</div>', unsafe_allow_html=True)
    st.caption(
        f"Upload a CSV of leads you already have (CRM export, event contacts, inbound sign-ups…). "
        f"Up to {MAX_LEADS_PER_RUN} rows per run. Columns: name, company, email, website, title, notes."
    )
    st.download_button(
        "Download CSV template",
        data=csv_template_bytes(),
        file_name="closeagent_leads_template.csv",
        mime="text/csv",
        icon=":material/download:",
    )
    uploaded = st.file_uploader("Lead list (CSV)", type=["csv"])

    leads: list[dict[str, str]] = []
    if uploaded is not None:
        try:
            leads = parse_leads_csv(uploaded.getvalue())
            st.success(f"Loaded {len(leads)} lead(s).")
            st.dataframe(
                [
                    {k: lead.get(k, "") for k in ("name", "company", "email", "domain", "title", "notes")}
                    for lead in leads
                ],
                hide_index=True,
            )
        except PipelineError as exc:
            st.error(str(exc))

    st.markdown('<div class="ca-command-title">◈ 2 · Your offer</div>', unsafe_allow_html=True)
    with st.form("offer_form"):
        col_a, col_b = st.columns(2)
        sender_name = col_a.text_input("Your name", placeholder="e.g. Alex")
        sender_company = col_b.text_input("Your company", placeholder="e.g. Atlas Online")
        product = st.text_area(
            "What do you offer?",
            placeholder="e.g. We build automated lead-qualification workflows for small agencies.",
        )
        cta = st.text_input(
            "Call to action",
            placeholder="e.g. Reply 'yes' and I'll send a 2-minute demo video",
        )
        language = st.selectbox(
            "Email language",
            ["Auto (match each company)", "English", "German", "Turkish", "Spanish", "French"],
        )

        with st.expander("API keys"):
            openai_input = st.text_input(
                "OpenAI API key",
                type="password",
                placeholder="Using saved secret" if saved_openai else "sk-…",
            )
            hunter_input = st.text_input(
                "Hunter.io API key (optional — only used for leads without an email)",
                type="password",
                placeholder="Using saved secret" if saved_hunter else "optional",
            )

        submitted = st.form_submit_button(
            "Write personalized drafts",
            type="primary",
            icon=":material/edit_note:",
            width="stretch",
        )

    openai_key = openai_input.strip() or saved_openai
    hunter_key = hunter_input.strip() or saved_hunter

    if submitted:
        if not leads:
            st.warning("Upload a lead CSV first.")
        elif not product.strip():
            st.warning("Describe what you offer so the drafts make sense.")
        elif not openai_key:
            st.warning("Add an OpenAI API key.")
        else:
            offer = {
                "sender_name": sender_name.strip(),
                "sender_company": sender_company.strip(),
                "product": product.strip(),
                "cta": cta.strip(),
                "language": "" if language.startswith("Auto") else language,
            }
            run_agent(openai_key, hunter_key, offer, leads)

    if st.session_state.api_error:
        st.error(st.session_state.api_error)

    if st.session_state.leads:
        st.markdown('<div class="ca-leads-header">◈ 3 · Review your drafts</div>', unsafe_allow_html=True)
        st.info(
            "Review and edit every draft before sending. You are responsible for complying "
            "with email laws in your recipients' countries (e.g. CAN-SPAM, GDPR, UWG)."
        )
        st.download_button(
            "Download drafts CSV",
            data=_csv_bytes(st.session_state.leads),
            file_name="closeagent_drafts.csv",
            mime="text/csv",
            icon=":material/download:",
        )
        render_drafts(st.session_state.leads)


if __name__ == "__main__":
    main()
