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
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  openaiKey: () => required("OPENAI_API_KEY"),
  openaiModel: () => optional("OPENAI_MODEL") || "gpt-4o-mini",
  youtubeKey: () => required("YOUTUBE_API_KEY"),
  hunterKey: () => optional("HUNTER_API_KEY"),
  stripeSecret: () => required("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => required("STRIPE_WEBHOOK_SECRET"),
  stripePriceId: () => required("STRIPE_PRICE_ID"),
  siteUrl: () => optional("NEXT_PUBLIC_SITE_URL") || "http://localhost:3000",
};
