import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";

// Next.js 16 "proxy" (formerly middleware): send signed-out users on /app to /login.
export default function proxy(request: NextRequest) {
  return auth().middleware({ loginUrl: "/login" })(request);
}

export const config = {
  matcher: ["/app/:path*"],
};
