"""CloseAgent.ai — Autonomous AI SDR
Premium dark-mode Streamlit command center: Apify → Hunter.io → OpenAI.
"""

from __future__ import annotations

import csv
import html
import io
import os
import time
from pathlib import Path
from typing import Any

import streamlit as st

try:
    from pipeline import (
        draft_emails_with_openai,
        enrich_leads_with_hunter,
        extract_lead_candidates,
        friendly_openai_error,
        scrape_with_apify,
    )
except ImportError as exc:  # pragma: no cover - environment setup guidance
    raise SystemExit(
        "Missing dependency. Activate the project virtualenv, then install:\n"
        "  source venv/bin/activate\n"
        "  pip install -r requirements.txt\n\n"
        "Run the app with:\n"
        "  streamlit run app.py\n"
        "or:\n"
        "  ./venv/bin/streamlit run app.py"
    ) from exc

# ── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="CloseAgent.ai — Autonomous Sales CEO",
    page_icon="◈",
    layout="wide",
    initial_sidebar_state="collapsed",
)

SIMULATION_STEPS = [
    ("Scanning the web with Apify...", 0.2),
    ("Verifying emails with Hunter.io...", 0.2),
    ("Drafting hyper-personalized emails...", 0.2),
]


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


# ── Session state ────────────────────────────────────────────────────────────
def init_state() -> None:
    defaults: dict[str, Any] = {
        "leads_analyzed": 1284,
        "emails_sent": 847,
        "revenue": 192400,
        "show_results": False,
        "active_draft": None,
        "target_query": "",
        "leads": [],
        "apify_rows": [],
        "api_error": None,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


# ── Secrets (.env, st.secrets, then Mission Control fields) ──────────────────
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


# ── UI helpers ───────────────────────────────────────────────────────────────
def render_metric_cards(leads: int, emails: int, revenue: int) -> None:
    html = f"""
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600&family=Space+Grotesk:wght@400;500&display=swap" rel="stylesheet">
<style>
  .ca-metrics {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.1rem;
    font-family: 'Space Grotesk', sans-serif;
  }}
  .ca-metric {{
    position: relative;
    background: rgba(16, 16, 36, 0.9);
    border: 1px solid rgba(120, 90, 255, 0.28);
    border-radius: 16px;
    padding: 1.35rem 1.4rem 1.25rem;
    overflow: hidden;
    backdrop-filter: blur(12px);
    transition: border-color 0.35s ease, transform 0.35s ease, box-shadow 0.35s ease;
  }}
  .ca-metric::before {{
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(61,224,255,0.08), transparent 50%, rgba(155,109,255,0.08));
    pointer-events: none;
  }}
  .ca-metric:hover {{
    border-color: rgba(100, 200, 255, 0.5);
    transform: translateY(-3px);
    box-shadow: 0 0 28px rgba(155, 109, 255, 0.35);
  }}
  .ca-metric-label {{
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #8b90b5;
    margin-bottom: 0.55rem;
    position: relative;
  }}
  .ca-metric-value {{
    font-family: 'Orbitron', sans-serif;
    font-size: 1.85rem;
    font-weight: 600;
    position: relative;
    text-shadow: 0 0 20px rgba(61, 224, 255, 0.25);
  }}
  .accent-blue {{ color: #3de0ff; }}
  .accent-purple {{ color: #9b6dff; }}
  .accent-pink {{ color: #ff8ad4; }}
  .ca-live-dot {{
    display: inline-block;
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #39ff8a;
    margin-right: 6px;
    box-shadow: 0 0 10px #39ff8a;
    animation: pulse 1.6s ease-in-out infinite;
    vertical-align: middle;
  }}
  @keyframes pulse {{
    0%, 100% {{ opacity: 1; transform: scale(1); }}
    50% {{ opacity: 0.45; transform: scale(0.85); }}
  }}
  @media (max-width: 700px) {{
    .ca-metrics {{ grid-template-columns: 1fr; }}
  }}
</style>
<div class="ca-metrics">
  <div class="ca-metric">
    <div class="ca-metric-label"><span class="ca-live-dot"></span>Leads Analyzed</div>
    <div class="ca-metric-value accent-blue" id="metric-leads">0</div>
  </div>
  <div class="ca-metric">
    <div class="ca-metric-label">Emails Sent</div>
    <div class="ca-metric-value accent-purple" id="metric-emails">0</div>
  </div>
  <div class="ca-metric">
    <div class="ca-metric-label">Estimated Revenue Generated</div>
    <div class="ca-metric-value accent-pink" id="metric-revenue">$0</div>
  </div>
</div>
<script>
(function() {{
  function animateCount(el, target, prefix, duration) {{
    if (!el) return;
    const start = Math.max(0, Math.floor(target * 0.82));
    const t0 = performance.now();
    function tick(now) {{
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.floor(start + (target - start) * eased);
      el.textContent = prefix + val.toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = prefix + target.toLocaleString();
    }}
    requestAnimationFrame(tick);
  }}
  animateCount(document.getElementById('metric-leads'), {leads}, '', 1300);
  animateCount(document.getElementById('metric-emails'), {emails}, '', 1300);
  animateCount(document.getElementById('metric-revenue'), {revenue}, '$', 1500);
}})();
</script>
"""
    st.iframe(html, height=130)


def render_simulation_frame(active_idx: int, done_through: int) -> str:
    rows = []
    for i, (label, _) in enumerate(SIMULATION_STEPS):
        if i <= done_through:
            cls, icon = "done", "✓"
        elif i == active_idx:
            cls, icon = "active", "◈"
        else:
            cls, icon = "", "○"
        rows.append(
            f'<div class="ca-step {cls}">'
            f'<div class="ca-step-icon">{icon}</div>'
            f'<div class="ca-step-text">{label}</div>'
            f"</div>"
        )
    return (
        '<div class="ca-sim-panel">'
        '<div class="ca-sim-title">◈ Agent Pipeline</div>'
        + "".join(rows)
        + "</div>"
    )


def _fail_agent(placeholder: Any, status: Any, message: str) -> None:
    status.empty()
    placeholder.empty()
    st.session_state.api_error = message
    st.session_state.show_results = False
    st.session_state.leads = []
    st.rerun()


def _hunter_api_key(override: str = "") -> str:
    """Prefer the Mission Control field, then st.secrets['HUNTER_API_KEY']."""
    if override.strip():
        return override.strip()
    try:
        return str(st.secrets["HUNTER_API_KEY"]).strip()
    except Exception:
        return secret_value("HUNTER_API_KEY", "hunter_api_key")


def run_agent(
    openai_key: str,
    apify_token: str,
    hunter_key: str,
    target: str,
    actor_id: str = "",
) -> None:
    """Apify scrape → Hunter.io emails → OpenAI drafts."""
    placeholder = st.empty()
    status = st.empty()

    placeholder.markdown(
        render_simulation_frame(active_idx=0, done_through=-1),
        unsafe_allow_html=True,
    )
    status.info(f"Scanning the web with Apify for '{target}'…")
    try:
        organic = scrape_with_apify(
            apify_token,
            target,
            actor_id=actor_id or None,
            on_progress=status.info,
        )
        st.session_state.apify_rows = organic
        candidates = extract_lead_candidates(organic)
    except Exception as exc:  # noqa: BLE001
        _fail_agent(placeholder, status, friendly_openai_error(exc))
        return
    status.success(f"Scraped {len(organic)} potential targets from Apify.")
    time.sleep(SIMULATION_STEPS[0][1])

    placeholder.markdown(
        render_simulation_frame(active_idx=1, done_through=0),
        unsafe_allow_html=True,
    )
    status.caption("Hunter.io is finding and verifying work emails…")
    try:
        leads = enrich_leads_with_hunter(hunter_key, candidates)
    except Exception as exc:  # noqa: BLE001
        _fail_agent(placeholder, status, friendly_openai_error(exc))
        return
    found_count = sum(
        1 for lead in leads if lead.get("email") and lead["email"] != "not found"
    )
    status.success(
        f"Hunter.io found {found_count} work email"
        f"{'' if found_count == 1 else 's'} across {len(leads)} leads."
    )
    time.sleep(SIMULATION_STEPS[1][1])

    placeholder.markdown(
        render_simulation_frame(active_idx=2, done_through=1),
        unsafe_allow_html=True,
    )
    status.caption("OpenAI is writing hyper-personalized cold emails…")
    try:
        leads = draft_emails_with_openai(openai_key, target, leads)
    except Exception as exc:  # noqa: BLE001
        _fail_agent(placeholder, status, friendly_openai_error(exc))
        return
    time.sleep(SIMULATION_STEPS[2][1])

    placeholder.markdown(
        render_simulation_frame(active_idx=-1, done_through=len(SIMULATION_STEPS) - 1),
        unsafe_allow_html=True,
    )
    status.empty()
    time.sleep(0.25)

    count = len(leads)
    st.session_state.leads = leads
    st.session_state.leads_analyzed += count
    st.session_state.emails_sent += count
    st.session_state.revenue += 6200 * count
    st.session_state.show_results = True
    st.session_state.api_error = None
    st.session_state.active_draft = None
    st.rerun()


def _csv_bytes(leads: list[dict[str, str]]) -> bytes:
    buffer = io.StringIO()
    writer = csv.DictWriter(
        buffer,
        fieldnames=[
            "name",
            "company",
            "email",
            "email_status",
            "email_score",
            "domain",
            "title",
            "url",
            "snippet",
            "pain_point",
            "draft",
        ],
    )
    writer.writeheader()
    for lead in leads:
        writer.writerow(
            {
                "name": lead.get("name", ""),
                "company": lead.get("company", ""),
                "email": lead.get("email", ""),
                "email_status": lead.get("email_status", ""),
                "email_score": lead.get("email_score", ""),
                "domain": lead.get("domain", ""),
                "title": lead.get("title", ""),
                "url": lead.get("url") or lead.get("source_url", ""),
                "snippet": lead.get("snippet") or lead.get("description", ""),
                "pain_point": lead.get("pain_point", ""),
                "draft": lead.get("draft", ""),
            }
        )
    return buffer.getvalue().encode("utf-8")


def render_leads_table(leads: list[dict[str, str]]) -> None:
    h1, h2, h3, h4, h5 = st.columns([1.1, 1.1, 1.35, 1.9, 0.9])
    for col, label in zip(
        (h1, h2, h3, h4, h5),
        ("Name", "Company", "Email", "Pain Point", "Action"),
    ):
        col.markdown(
            f"<div style='font-size:0.65rem;letter-spacing:0.14em;text-transform:uppercase;"
            f"color:#8b90b5;margin:0.2rem 0 0.5rem;'>{label}</div>",
            unsafe_allow_html=True,
        )

    for i, lead in enumerate(leads):
        with st.container(border=True):
            c1, c2, c3, c4, c5 = st.columns(
                [1.1, 1.1, 1.35, 1.9, 0.9], vertical_alignment="center"
            )
            c1.markdown(
                f"<div style='color:#e8eaf6;font-weight:600;'>{html.escape(lead['name'])}</div>",
                unsafe_allow_html=True,
            )
            c2.markdown(
                f"<div style='color:#9b6dff;font-weight:500;'>{html.escape(lead['company'])}</div>",
                unsafe_allow_html=True,
            )
            status = html.escape(lead.get("email_status") or "")
            email_label = html.escape(lead.get("email") or "not found")
            c3.markdown(
                f"<div style='color:#3de0ff;font-size:0.82rem;line-height:1.35;'>"
                f"{email_label}<br>"
                f"<span style='color:#8b90b5;font-size:0.72rem;'>{status}</span></div>",
                unsafe_allow_html=True,
            )
            c4.markdown(
                f"<div style='color:#c8cce8;font-size:0.88rem;line-height:1.35;'>"
                f"{html.escape(lead['pain_point'])}</div>",
                unsafe_allow_html=True,
            )
            with c5:
                if st.button("View AI Draft", key=f"draft_{i}", width="stretch"):
                    st.session_state.active_draft = (
                        None if st.session_state.active_draft == i else i
                    )

        if st.session_state.active_draft == i:
            safe_name = html.escape(lead["name"])
            safe_company = html.escape(lead["company"])
            safe_draft = html.escape(lead["draft"])
            st.markdown(
                f'<div class="ca-draft">'
                f'<div class="ca-draft-label">◈ AI Draft — {safe_name} @ {safe_company}</div>'
                f"{safe_draft}</div>",
                unsafe_allow_html=True,
            )


def render_cold_emails(leads: list[dict[str, str]]) -> None:
    """Stack one hyper-personalized cold email per Apify target."""
    for i, lead in enumerate(leads, start=1):
        title = html.escape(lead.get("title") or lead.get("company") or f"Target {i}")
        url = lead.get("url") or lead.get("source_url") or ""
        safe_url = html.escape(url)
        email = html.escape(lead.get("email") or "not found")
        email_status = html.escape(lead.get("email_status") or "")
        snippet = html.escape(lead.get("snippet") or lead.get("description") or "")
        pain = html.escape(lead.get("pain_point") or "")
        draft = html.escape(lead.get("draft") or "")
        email_html = (
            f'<div style="color:#3de0ff;font-size:0.82rem;margin-bottom:0.55rem;">'
            f"{email}"
            f'<span style="color:#8b90b5;font-size:0.72rem;">'
            f"{' · ' + email_status if email_status else ''}</span></div>"
        )
        snippet_html = (
            f'<div style="color:#8b90b5;font-size:0.82rem;line-height:1.45;'
            f'margin-bottom:0.85rem;">{snippet}</div>'
            if snippet
            else ""
        )
        pain_html = (
            f'<div style="color:#c8cce8;font-size:0.8rem;margin-bottom:0.85rem;">'
            f'<span style="color:#ff5ec8;letter-spacing:0.08em;text-transform:uppercase;'
            f'font-size:0.65rem;">Pain point</span><br>{pain}</div>'
            if pain
            else ""
        )
        with st.container(border=True):
            st.markdown(
                f'<div class="ca-draft" style="margin:0;box-shadow:none;">'
                f'<div class="ca-draft-label">◈ Cold email {i} — {title}</div>'
                f'<div style="margin-bottom:0.55rem;">'
                f'<a href="{safe_url}" style="color:#3de0ff;font-size:0.82rem;'
                f'word-break:break-all;">{safe_url}</a></div>'
                f"{email_html}{snippet_html}{pain_html}"
                f"{draft}</div>",
                unsafe_allow_html=True,
            )


# ── App ──────────────────────────────────────────────────────────────────────
def main() -> None:
    load_local_env()
    inject_styles()
    init_state()

    saved_openai = secret_value("OPENAI_API_KEY", "openai_api_key")
    saved_apify = secret_value("APIFY_API_TOKEN", "apify_api_token")
    saved_hunter = secret_value("HUNTER_API_KEY", "hunter_api_key")
    apify_actor = secret_value("APIFY_ACTOR_ID", "apify_actor_id")

    st.markdown(
        """
<div class="ca-hero">
  <h1 class="ca-brand">CloseAgent.ai</h1>
  <div class="ca-tagline">Autonomous AI SDR</div>
  <div class="ca-divider"></div>
</div>
""",
        unsafe_allow_html=True,
    )

    render_metric_cards(
        st.session_state.leads_analyzed,
        st.session_state.emails_sent,
        st.session_state.revenue,
    )

    st.markdown(
        '<div class="ca-command-title" style="margin-bottom:0.75rem;">◈ Mission Control</div>',
        unsafe_allow_html=True,
    )
    with st.form("mission_control"):
        openai_input = st.text_input(
            "OpenAI API key",
            type="password",
            placeholder="Using saved secret" if saved_openai else "sk-••••••••••••••••",
            help="Leave blank to use OPENAI_API_KEY from .env or .streamlit/secrets.toml.",
        )
        apify_input = st.text_input(
            "Apify API token",
            type="password",
            placeholder="Using saved secret" if saved_apify else "apify_api_••••••••",
            help="Leave blank to use APIFY_API_TOKEN from .env or .streamlit/secrets.toml.",
        )
        hunter_input = st.text_input(
            "Hunter.io API key",
            type="password",
            placeholder="Using saved secret" if saved_hunter else "••••••••••••••••",
            help="Leave blank to use HUNTER_API_KEY from .env or .streamlit/secrets.toml.",
        )
        target = st.text_input(
            "Target audience",
            placeholder="e.g. London B2B SaaS founders",
        )
        unleash = st.form_submit_button(
            "Find targets and generate emails",
            type="primary",
            icon=":material/rocket_launch:",
            width="stretch",
        )

    openai_key = openai_input.strip() or saved_openai
    apify_token = apify_input.strip() or saved_apify
    hunter_key = _hunter_api_key(hunter_input)

    if st.session_state.api_error:
        st.error(st.session_state.api_error)

    if unleash:
        if not apify_token or not target.strip():
            st.warning("Fill in the Apify token and target audience fields first.")
        elif not openai_key:
            st.warning("Add an **OpenAI API key** before running the agent.")
        elif not hunter_key:
            st.warning("Add a **Hunter.io API key** (or set HUNTER_API_KEY in secrets) before running the agent.")
        else:
            st.session_state.target_query = target.strip()
            st.session_state.show_results = False
            st.session_state.api_error = None
            st.session_state.leads = []
            st.session_state.apify_rows = []
            st.session_state.active_draft = None
            run_agent(
                openai_key,
                apify_token,
                hunter_key,
                target.strip(),
                actor_id=apify_actor,
            )

    if st.session_state.target_query and (
        st.session_state.apify_rows or st.session_state.show_results
    ):
        st.markdown(
            f"<p style='color:#8b90b5;font-size:0.85rem;margin-bottom:0.75rem;'>"
            f"Mission target: <span style='color:#3de0ff;'>"
            f"{html.escape(st.session_state.target_query)}</span></p>",
            unsafe_allow_html=True,
        )

    if st.session_state.apify_rows:
        st.markdown(
            '<div class="ca-leads-header">◈ Apify scrape results</div>',
            unsafe_allow_html=True,
        )
        st.success(
            f"Scraped {len(st.session_state.apify_rows)} potential targets from Apify."
        )
        st.dataframe(
            st.session_state.apify_rows,
            hide_index=True,
            column_config={
                "title": st.column_config.TextColumn("Title"),
                "url": st.column_config.LinkColumn("URL"),
                "description": st.column_config.TextColumn("Snippet"),
            },
        )

    if st.session_state.show_results and st.session_state.leads:
        st.markdown(
            '<div class="ca-leads-header">◈ Verified leads</div>',
            unsafe_allow_html=True,
        )
        found_count = sum(
            1
            for lead in st.session_state.leads
            if lead.get("email") and lead["email"] != "not found"
        )
        st.success(
            f"Generated {len(st.session_state.leads)} cold emails. "
            f"Hunter.io found {found_count} work email"
            f"{'' if found_count == 1 else 's'}. Drafts written with OpenAI."
        )
        st.dataframe(
            [
                {
                    "name": lead.get("name", ""),
                    "company": lead.get("company", ""),
                    "email": lead.get("email", ""),
                    "hunter_status": lead.get("email_status", ""),
                    "domain": lead.get("domain", ""),
                    "url": lead.get("url") or lead.get("source_url", ""),
                    "pain_point": lead.get("pain_point", ""),
                }
                for lead in st.session_state.leads
            ],
            hide_index=True,
            column_config={
                "name": st.column_config.TextColumn("Name"),
                "company": st.column_config.TextColumn("Company"),
                "email": st.column_config.TextColumn("Email"),
                "hunter_status": st.column_config.TextColumn("Hunter status"),
                "domain": st.column_config.TextColumn("Domain"),
                "url": st.column_config.LinkColumn("URL"),
                "pain_point": st.column_config.TextColumn("Pain point"),
            },
        )
        st.download_button(
            "Download emails CSV",
            data=_csv_bytes(st.session_state.leads),
            file_name="closeagent_emails.csv",
            mime="text/csv",
            icon=":material/download:",
        )
        render_leads_table(st.session_state.leads)
        st.markdown(
            '<div class="ca-leads-header">◈ Hyper-personalized cold emails</div>',
            unsafe_allow_html=True,
        )
        render_cold_emails(st.session_state.leads)


if __name__ == "__main__":
    main()
