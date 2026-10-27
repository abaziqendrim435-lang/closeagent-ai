import { auth } from "@/lib/auth/server";

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return auth().handler().GET(req, ctx);
}

export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return auth().handler().POST(req, ctx);
}
