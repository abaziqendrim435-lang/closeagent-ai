# CloseAgent SaaS (Next.js 16 + Neon + Stripe)

Find YouTube creators and company decision-makers with their **public** business emails, then write personalized outreach with AI.

- **Creators:** YouTube Data API v3 — searches recent videos on a topic, reads each channel's public description and extracts the business email the creator published. The hidden "View email address" button is never accessed.
- **Companies:** Hunter.io domain search (senior/executive contacts).
- **Drafts:** OpenAI, server-side, limited per plan (`src/lib/plans.ts`).
- **Database:** Neon Postgres (`neon/schema.sql`, already applied to project `closeagentai`, branch `production`).
- **Auth:** Neon Managed Better Auth (email + password), enabled on branch `production`.
- **Billing:** Stripe Checkout subscription + customer portal; webhook keeps `profiles.subscription_status` in sync.

## Environment variables

See `.env.example`. Minimum to run: `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `OPENAI_API_KEY`, `YOUTUBE_API_KEY`.
Stripe and Hunter are optional until you use billing / company search.

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # unit tests (mocked APIs)
```

## Deploy (Vercel)

1. Import the GitHub repo in Vercel, **Root Directory = `web`**, branch `saas`.
2. Add the env vars above, deploy.
3. In Neon Console → Auth → Configuration, add your Vercel domain as a trusted domain.
4. Set `NEXT_PUBLIC_SITE_URL` to the final URL and redeploy.

### Stripe (when you start charging)

Create product "CloseAgent Pro", recurring $39.99/month → `STRIPE_PRICE_ID`.
Webhook endpoint `https://YOUR-DOMAIN/api/stripe/webhook`, events `customer.subscription.created|updated|deleted` → `STRIPE_WEBHOOK_SECRET`.
Activate the customer portal in Stripe settings.

## Compliance

CloseAgent only uses contact details people publish themselves and does not send email.
Users review every draft and are responsible for CAN-SPAM / GDPR compliance; every draft ends with an opt-out line.
