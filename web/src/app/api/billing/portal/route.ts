import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/account";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";

export async function POST() {
  try {
    const { profile } = await requireUser();
    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "No subscription yet." }, { status: 400 });
    }
    const session = await stripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${env.siteUrl()}/app/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return errorResponse(err);
  }
}
