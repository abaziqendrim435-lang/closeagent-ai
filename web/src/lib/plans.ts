export type PlanId = "free" | "pro";

export interface PlanLimits {
  searches: number; // influencer searches per month
  drafts: number; // AI drafts per month
  lookups: number; // Hunter.io company lookups per month
}

export const PLANS: Record<PlanId, { name: string; price: string; limits: PlanLimits }> = {
  free: { name: "Free trial", price: "$0", limits: { searches: 3, drafts: 15, lookups: 0 } },
  pro: { name: "Pro", price: "$39.99/month", limits: { searches: 100, drafts: 600, lookups: 150 } },
};

const ACTIVE = new Set(["active", "trialing", "past_due"]);

export function planFor(subscriptionStatus: string | null | undefined): PlanId {
  return ACTIVE.has(subscriptionStatus ?? "") ? "pro" : "free";
}

export function currentMonth(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}
