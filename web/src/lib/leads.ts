import { sql } from "@/lib/db";

export interface NewLead {
  source: "youtube" | "hunter" | "csv";
  name: string;
  company: string;
  email: string;
  email_source: string;
  website: string;
  title: string;
  notes: string;
  external_id: string | null;
  subscribers: number | null;
}

/**
 * Insert or refresh leads for a user. Rows with an external_id (YouTube channel,
 * Hunter email) are de-duplicated per user; a manually added email is kept.
 */
export async function upsertLeads(userId: string, leads: NewLead[]) {
  if (!leads.length) return;
  const rows = JSON.stringify(leads);
  await sql()`
    insert into leads (user_id, source, name, company, email, email_source, website, title, notes, external_id, subscribers)
    select ${userId}, r.source, r.name, r.company, r.email, r.email_source, r.website, r.title, r.notes, r.external_id, r.subscribers
    from jsonb_to_recordset(${rows}::jsonb) as r(
      source text, name text, company text, email text, email_source text, website text,
      title text, notes text, external_id text, subscribers bigint)
    on conflict (user_id, source, external_id) do update set
      name = excluded.name,
      company = excluded.company,
      website = excluded.website,
      title = excluded.title,
      notes = excluded.notes,
      subscribers = excluded.subscribers,
      email = case when leads.email_source = 'manual' and leads.email <> '' then leads.email else excluded.email end,
      email_source = case when leads.email_source = 'manual' and leads.email <> '' then leads.email_source else excluded.email_source end`;
}
