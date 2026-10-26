# CloseAgent.ai — AI Outreach Copilot

Upload your own lead list (CSV) → optionally look up missing work emails with Hunter.io → OpenAI writes a short, personalized first-touch email for every lead. You review, edit and send the drafts yourself.

## Setup

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your OPENAI_API_KEY (HUNTER_API_KEY optional)
streamlit run app.py
```

## CSV format

`name, company, email, website, title, notes` — header names are flexible (e.g. `company_name`, `target_email`, `url` also work). Comma, semicolon or tab separated. Up to 50 rows per run. Download the template inside the app.

## Notes

- CloseAgent does not scrape the web and does not send emails.
- Every draft ends with an opt-out line. You are responsible for complying with email laws (CAN-SPAM, GDPR, UWG, …) in your recipients' countries.

## Hosted SaaS (Whop)

1. On Whop, create a product with a monthly plan and add the **Software** app so buyers get a license key.
2. Create an API key (Developer → API keys) with `member:basic:read`.
3. Deploy to Render (`render.yaml` included) and set `WHOP_API_KEY` and `WHOP_PRODUCT_ID`.
4. Do **not** set `OPENAI_API_KEY` on the server — in hosted mode every customer enters their own key.

When `WHOP_API_KEY` is set, the app asks for a valid Whop license key before showing anything.
