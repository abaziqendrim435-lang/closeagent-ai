import { createNeonAuth } from "@neondatabase/auth/next/server";

type NeonAuth = ReturnType<typeof createNeonAuth>;
let instance: NeonAuth | null = null;

/** Neon Managed Better Auth (users stored in the neon_auth schema). Created lazily so builds don't need env vars. */
export function auth(): NeonAuth {
  if (!instance) {
    instance = createNeonAuth({
      baseUrl: process.env.NEON_AUTH_BASE_URL!,
      cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
    });
  }
  return instance;
}
