import { NextResponse } from "next/server";
import { z } from "zod";
import { addUsage, assertQuota, errorResponse, requireUser } from "@/lib/account";
import { sql } from "@/lib/db";
import { writeDrafts, type DraftLead } from "@/lib/drafts";

const Body = z.object({ leadIds: z.array(z.string().uuid()).min(1).max(50) });

export async function POST(req: Request) {
  try {
    const { user, profile } = await requireUser();
    const { leadIds } = Body.parse(await req.json());
    if (!profile.offer.trim()) {
      return NextResponse.json({ error: "Describe your offer in “Offer & billing” first." }, { status: 400 });
    }
    await assertQuota(user.id, profile.subscription_status, "drafts", leadIds.length);

    const leads = (await sql()`
      select id, name, company, title, website, notes, subscribers
      from leads where user_id = ${user.id} and id = any(${leadIds}::uuid[])`) as DraftLead[];
    if (!leads.length) return NextResponse.json({ error: "Leads not found." }, { status: 404 });

    const results = await writeDrafts(
      {
        senderName: profile.sender_name,
        senderCompany: profile.sender_company,
        offer: profile.offer,
        cta: profile.cta,
        language: profile.language,
      },
      leads.map((l) => ({ ...l, subscribers: l.subscribers === null ? null : Number(l.subscribers) })),
    );
    await addUsage(user.id, "drafts", results.length);

    if (results.length) {
      const rows = JSON.stringify(results);
      await sql()`
        insert into drafts (user_id, lead_id, subject, body, angle)
        select ${user.id}, r."leadId"::uuid, r.subject, r.body, r.angle
        from jsonb_to_recordset(${rows}::jsonb) as r("leadId" text, subject text, body text, angle text)
        where exists (select 1 from leads l where l.id = r."leadId"::uuid and l.user_id = ${user.id})`;
      await sql()`update leads set status = 'drafted'
                  where user_id = ${user.id} and status = 'new' and id = any(${results.map((r) => r.leadId)}::uuid[])`;
    }
    return NextResponse.json({ drafts: results, missing: leads.length - results.length });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Select 1–50 leads." }, { status: 400 });
    return errorResponse(err);
  }
}
