import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { env } from "@/lib/env";

let client: NeonQueryFunction<false, false> | null = null;

/**
 * Tagged-template SQL over HTTP (Neon serverless driver). Values are always sent
 * as parameters, never interpolated, e.g. sql`select * from leads where user_id = ${id}`.
 * Every query in this app is scoped by user_id on the server.
 */
export function sql() {
  if (!client) client = neon(env.databaseUrl());
  return client;
}
