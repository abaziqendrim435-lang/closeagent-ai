import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, getUsage, requireUser } from "@/lib/account";
import { sql } from "@/lib/db";
import { PLANS, planFor } from "@/lib/plans";

const Body = z.object({
  sender_name: z.string().trim().max(80),
  sender_company: z.string().trim().max(120),
  offer: z.string().trim().max(1500),
  cta: z.string().trim().max(200),
  language: z.string().trim().max(40),
});

export async function GET() {
  try {
    const { user, profile } = await requireUser();
    const plan = planFor(profile.subscription_status);
    return NextResponse.json({ profile, plan, limits: PLANS[plan].limits, usage: await getUsage(user.id) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: Request) {
  try {
    const { user } = await requireUser();
    const f = Body.parse(await req.json());
    await sql()`update profiles set sender_name = ${f.sender_name}, sender_company = ${f.sender_company},
                offer = ${f.offer}, cta = ${f.cta}, language = ${f.language || "English"}
                where user_id = ${user.id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Invalid settings." }, { status: 400 });
    return errorResponse(err);
  }
}
