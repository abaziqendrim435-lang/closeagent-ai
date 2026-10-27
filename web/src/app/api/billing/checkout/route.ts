import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/account";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST() {
  try {
    const { user, profile } = await requireUser();
    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe().customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabaseAdmin().from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: env.stripePriceId(), quantity: 1 }],
      client_reference_id: user.id,
      allow_promotion_codes: true,
      success_url: `${env.siteUrl()}/app?upgraded=1`,
      cancel_url: `${env.siteUrl()}/app/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return errorResponse(err);
  }
}
