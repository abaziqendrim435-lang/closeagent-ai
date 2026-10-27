import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { PLANS, currentMonth, planFor, type PlanLimits } from "@/lib/plans";

export type UsageField = keyof PlanLimits;

export interface Profile {
  id: string;
  email: string | null;
  sender_name: string;
  sender_company: string;
  offer: string;
  cta: string;
  language: string;
  stripe_customer_id: string | null;
  subscription_status: string;
  current_period_end: string | null;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Load the signed-in user and profile, or throw 401. */
export async function requireUser() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new HttpError(401, "Please sign in.");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return { supabase, user, profile: (profile ?? null) as Profile | null };
}

export async function getUsage(userId: string) {
  const { data } = await supabaseAdmin()
    .from("usage")
    .select("searches, drafts, lookups")
    .eq("user_id", userId)
    .eq("month", currentMonth())
    .maybeSingle();
  return { searches: data?.searches ?? 0, drafts: data?.drafts ?? 0, lookups: data?.lookups ?? 0 };
}

/** Throw 402 if the user cannot spend `amount` of `field` this month; return remaining. */
export async function assertQuota(userId: string, status: string | undefined, field: UsageField, amount = 1) {
  const plan = planFor(status);
  const limit = PLANS[plan].limits[field];
  const used = (await getUsage(userId))[field];
  if (used + amount > limit) {
    const what = { searches: "searches", drafts: "AI drafts", lookups: "company lookups" }[field];
    throw new HttpError(
      402,
      plan === "free"
        ? `Free trial limit reached for ${what}. Upgrade to Pro to continue.`
        : `Monthly limit reached for ${what} (${limit}). It resets next month.`,
    );
  }
  return limit - used;
}

export async function addUsage(userId: string, field: UsageField, amount: number) {
  if (amount <= 0) return;
  const { error } = await supabaseAdmin().rpc("increment_usage", {
    p_user: userId,
    p_month: currentMonth(),
    p_field: field,
    p_amount: amount,
  });
  if (error) console.error("increment_usage failed", error.message);
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
  console.error(err);
  const message = err instanceof Error ? err.message : "Unexpected error";
  return NextResponse.json({ error: message }, { status: 500 });
}
