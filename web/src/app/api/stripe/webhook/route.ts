import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";

// Keeps profiles.subscription_status in sync with Stripe.
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, env.stripeWebhookSecret());
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const periodEnd = sub.items?.data?.[0]?.current_period_end;
    const status = event.type === "customer.subscription.deleted" ? "canceled" : sub.status;
    await sql()`update profiles set subscription_status = ${status},
                current_period_end = ${periodEnd ? new Date(periodEnd * 1000).toISOString() : null}
                where stripe_customer_id = ${customerId}`;
  }
  return NextResponse.json({ received: true });
}
