import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, requireUser } from "@/lib/account";
import { csvToLeads, toCsv } from "@/lib/csv";
import { sql } from "@/lib/db";

interface LeadRow {
  id: string;
  name: string;
  company: string;
  email: string;
  website: string;
  title: string;
  subscribers: number | null;
  notes: string;
  status: string;
  draft: { subject: string; body: string; angle: string } | null;
}

/** List leads with their latest draft (JSON), or export as CSV (?format=csv). */
export async function GET(req: Request) {
  try {
    const { user } = await requireUser();
    const leads = (await sql()`
      select l.id, l.source, l.name, l.company, l.email, l.email_source, l.website, l.title, l.notes,
             l.subscribers, l.status, l.created_at,
             (select json_build_object('subject', d.subject, 'body', d.body, 'angle', d.angle)
                from drafts d where d.lead_id = l.id and d.user_id = l.user_id
                order by d.created_at desc limit 1) as draft
      from leads l
      where l.user_id = ${user.id}
      order by l.created_at desc
      limit 500`) as LeadRow[];

    if (new URL(req.url).searchParams.get("format") === "csv") {
      const rows = leads.map((l) => ({ ...l, subject: l.draft?.subject ?? "", body: l.draft?.body ?? "" }));
      const csv = toCsv(rows, ["name", "company", "email", "website", "title", "subscribers", "notes", "status", "subject", "body"]);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="closeagent-leads.csv"',
        },
      });
    }
    // bigint comes back as a string from Postgres.
    return NextResponse.json({
      leads: leads.map((l) => ({ ...l, subscribers: l.subscribers === null ? null : Number(l.subscribers) })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Import a CSV (multipart field "file"). */
export async function POST(req: Request) {
  try {
    const { user } = await requireUser();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Attach a CSV file." }, { status: 400 });
    if (file.size > 2_000_000) return NextResponse.json({ error: "CSV is too large (max 2 MB)." }, { status: 400 });
    const leads = csvToLeads(await file.text());
    if (!leads.length) {
      return NextResponse.json(
        { error: "No rows found. The first row must contain headers like name, company, email, website, notes." },
        { status: 400 },
      );
    }
    const rows = JSON.stringify(leads.map((l) => ({ ...l, email_source: l.email ? "csv" : "" })));
    await sql()`
      insert into leads (user_id, source, name, company, email, email_source, website, title, notes)
      select ${user.id}, 'csv', r.name, r.company, r.email, r.email_source, r.website, r.title, r.notes
      from jsonb_to_recordset(${rows}::jsonb) as r(name text, company text, email text, email_source text,
        website text, title text, notes text)`;
    return NextResponse.json({ imported: leads.length });
  } catch (err) {
    return errorResponse(err);
  }
}

const Patch = z.object({
  id: z.string().uuid(),
  email: z.string().trim().max(200).optional(),
  status: z.enum(["new", "drafted", "sent"]).optional(),
});

export async function PATCH(req: Request) {
  try {
    const { user } = await requireUser();
    const { id, email, status } = Patch.parse(await req.json());
    if (email !== undefined) {
      await sql()`update leads set email = ${email}, email_source = ${email ? "manual" : ""}
                  where id = ${id} and user_id = ${user.id}`;
    }
    if (status) await sql()`update leads set status = ${status} where id = ${id} and user_id = ${user.id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Invalid update." }, { status: 400 });
    return errorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const { user } = await requireUser();
    const ids = z.array(z.string().uuid()).min(1).max(500).parse((await req.json()).ids);
    await sql()`delete from leads where user_id = ${user.id} and id = any(${ids}::uuid[])`;
    return NextResponse.json({ deleted: ids.length });
  } catch (err) {
    return errorResponse(err);
  }
}
