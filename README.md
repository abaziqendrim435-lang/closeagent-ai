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
