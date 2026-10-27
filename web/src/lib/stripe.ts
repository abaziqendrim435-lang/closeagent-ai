import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | null = null;

export function stripe() {
  if (!client) client = new Stripe(env.stripeSecret());
  return client;
}
