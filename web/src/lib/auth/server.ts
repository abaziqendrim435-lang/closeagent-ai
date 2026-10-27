import { createNeonAuth } from "@neondatabase/auth/next/server";

type NeonAuth = ReturnType<typeof createNeonAuth>;
let instance: NeonAuth | null = null;

// Public Neon Auth endpoint for the "closeagentai" project (not a secret; also shown in the Neon Console).
const DEFAULT_AUTH_URL = "https://ep-gentle-snow-b42k9viq.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth";

function authBaseUrl(): string {
  const raw = (process.env.NEON_AUTH_BASE_URL ?? "").trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
  try {
    const url = new URL(raw);
    if (url.protocol === "https:" && url.hostname.includes(".")) return raw;
  } catch {
    // fall through
  }
  if (raw) console.warn("NEON_AUTH_BASE_URL is not a valid https URL; using the default project endpoint.");
  return DEFAULT_AUTH_URL;
}

/** Neon Managed Better Auth (users stored in the neon_auth schema). Created lazily so builds don't need env vars. */
export function auth(): NeonAuth {
  if (!instance) {
    instance = createNeonAuth({
      baseUrl: authBaseUrl(),
      cookies: { secret: (process.env.NEON_AUTH_COOKIE_SECRET ?? "").trim() },
    });
  }
  return instance;
}
