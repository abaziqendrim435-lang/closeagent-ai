import { NextResponse } from "next/server";
import { z } from "zod";
import { addUsage, assertQuota, errorResponse, requireUser } from "@/lib/account";
import { writeDrafts } from "@/lib/drafts";

const Body = z.object({ leadIds: z.array(z.string().uuid()).min(1).max(50) });

export async function POST(req: Request) {
  try {
    const { supabase, user, profile } = await requireUser();
    const { leadIds } = Body.parse(await req.json());
    if (!profile?.offer?.trim()) {
      return NextResponse.json({ error: "Describe your offer in Settings first." }, { status: 400 });
    }
    await assertQuota(user.id, profile.subscription_status, "drafts", leadIds.length);

    const { data: leads, error } = await supabase
      .from("leads")
      .select("id, name, company, title, website, notes, subscribers")
      .in("id", leadIds);
    if (error) throw new Error(error.message);
    if (!leads?.length) return NextResponse.json({ error: "Leads not found." }, { status: 404 });

    const results = await writeDrafts(
      {
        senderName: profile.sender_name,
        senderCompany: profile.sender_company,
        offer: profile.offer,
        cta: profile.cta,
        language: profile.language,
      },
      leads.map((l) => ({ ...l, notes: l.notes ?? "", title: l.title ?? "", website: l.website ?? "" })),
    );
    await addUsage(user.id, "drafts", results.length);

    if (results.length) {
      const { error: insErr } = await supabase.from("drafts").insert(
        results.map((r) => ({ user_id: user.id, lead_id: r.leadId, subject: r.subject, body: r.body, angle: r.angle })),
      );
      if (insErr) throw new Error(insErr.message);
      await supabase.from("leads").update({ status: "drafted" }).in("id", results.map((r) => r.leadId)).eq("status", "new");
    }
    return NextResponse.json({ drafts: results, missing: leads.length - results.length });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Select 1–50 leads." }, { status: 400 });
    return errorResponse(err);
  }
}
