// Server-side environment access. Never import this file from client components.

function optional(name: string): string {
  return (process.env[name] ?? "").trim();
}

function required(name: string): string {
  const value = optional(name);
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const env = {
  databaseUrl: () => required("DATABASE_URL"),
  neonAuthBaseUrl: () => required("NEON_AUTH_BASE_URL"),
  neonAuthCookieSecret: () => required("NEON_AUTH_COOKIE_SECRET"),
  openaiKey: () => required("OPENAI_API_KEY"),
  openaiModel: () => optional("OPENAI_MODEL") || "gpt-4o-mini",
  youtubeKey: () => required("YOUTUBE_API_KEY"),
  hunterKey: () => optional("HUNTER_API_KEY"),
  stripeSecret: () => required("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => required("STRIPE_WEBHOOK_SECRET"),
  stripePriceId: () => required("STRIPE_PRICE_ID"),
  siteUrl: () => optional("NEXT_PUBLIC_SITE_URL") || "http://localhost:3000",
};
