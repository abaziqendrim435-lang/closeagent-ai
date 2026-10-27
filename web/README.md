# CloseAgent SaaS (Next.js + Supabase + Stripe)

Find YouTube creators and company decision-makers with their **public** business emails, then write personalized outreach with AI.

- **Creators:** YouTube Data API v3 — searches recent videos on a topic, reads each channel's public description and extracts the business email the creator published. The hidden "View email address" button is never accessed.
- **Companies:** Hunter.io domain search (senior/executive contacts).
- **Drafts:** OpenAI, server-side, limited per plan (see `src/lib/plans.ts`).
- **Billing:** Stripe Checkout subscription + customer portal; webhook keeps `profiles.subscription_status` in sync.

## Setup (≈30 minutes)

1. **Supabase** → new project → SQL Editor → run `supabase/schema.sql`.
   Authentication → URL Configuration → add `https://YOUR-DOMAIN/auth/callback` (and `http://localhost:3000/auth/callback`).
2. **YouTube API key** → Google Cloud Console → enable *YouTube Data API v3* → Credentials → API key.
   Default quota is 10,000 units/day (one creator search ≈ 100–200 units).
3. **Stripe** → create a product "CloseAgent Pro", recurring $39.99/month → copy the `price_...` id.
   Developers → Webhooks → endpoint `https://YOUR-DOMAIN/api/stripe/webhook`, events
   `customer.subscription.created|updated|deleted` → copy the signing secret.
   Settings → Billing → Customer portal → activate.
4. **Hunter.io** (optional) → API key for "Find companies".
5. Copy `.env.example` to `.env.local` and fill everything in.

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # unit tests (mocked APIs)
```

## Deploy (Vercel)

Import the GitHub repo in Vercel, set **Root Directory = `web`**, add the same env vars, deploy.
Set `NEXT_PUBLIC_SITE_URL` to the final URL.

## Compliance

CloseAgent only uses contact details people publish themselves and does not send email.
Users review every draft and are responsible for CAN-SPAM / GDPR compliance; every draft ends with an opt-out line.
