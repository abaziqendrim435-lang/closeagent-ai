import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";
import { PLANS, currentMonth, planFor, type PlanLimits } from "@/lib/plans";

export type UsageField = keyof PlanLimits;

export interface Profile {
  user_id: string;
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

/** Load the signed-in user and their profile (created on first use), or throw 401. */
export async function requireUser() {
  const { data: session } = await auth().getSession();
  const user = session?.user;
  if (!user?.id) throw new HttpError(401, "Please sign in.");
  const rows = (await sql()`
    insert into profiles (user_id, email) values (${user.id}, ${user.email ?? null})
    on conflict (user_id) do update set email = coalesce(excluded.email, profiles.email)
    returning *`) as Profile[];
  return { user: { id: user.id, email: user.email ?? null }, profile: rows[0] };
}

export async function getUsage(userId: string) {
  const rows = (await sql()`
    select searches, drafts, lookups from usage where user_id = ${userId} and month = ${currentMonth()}`) as Array<
    Record<UsageField, number>
  >;
  return { searches: rows[0]?.searches ?? 0, drafts: rows[0]?.drafts ?? 0, lookups: rows[0]?.lookups ?? 0 };
}

/** Throw 402 if the user cannot spend `amount` of `field` this month. */
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
  const month = currentMonth();
  const q = sql();
  // Column names can't be parameters; `field` is a closed union, so pick the statement explicitly.
  if (field === "searches")
    await q`insert into usage (user_id, month, searches) values (${userId}, ${month}, ${amount})
            on conflict (user_id, month) do update set searches = usage.searches + ${amount}`;
  else if (field === "drafts")
    await q`insert into usage (user_id, month, drafts) values (${userId}, ${month}, ${amount})
            on conflict (user_id, month) do update set drafts = usage.drafts + ${amount}`;
  else
    await q`insert into usage (user_id, month, lookups) values (${userId}, ${month}, ${amount})
            on conflict (user_id, month) do update set lookups = usage.lookups + ${amount}`;
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
  console.error(err);
  const message = err instanceof Error ? err.message : "Unexpected error";
  return NextResponse.json({ error: message }, { status: 500 });
}
