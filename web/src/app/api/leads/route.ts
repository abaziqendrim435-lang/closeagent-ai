import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, requireUser } from "@/lib/account";
import { csvToLeads, toCsv } from "@/lib/csv";

/** List leads (JSON) or export them with their latest draft (?format=csv). */
export async function GET(req: Request) {
  try {
    const { supabase } = await requireUser();
    const { data: leads, error } = await supabase
      .from("leads")
      .select("*, drafts(subject, body, angle, created_at)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const withLatest = (leads ?? []).map((l) => {
      const drafts = ((l.drafts ?? []) as Array<{ created_at: string }>).sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      );
      return { ...l, drafts: undefined, draft: drafts[0] ?? null };
    });

    if (new URL(req.url).searchParams.get("format") === "csv") {
      const rows = withLatest.map((l) => ({
        ...l,
        subject: l.draft?.subject ?? "",
        body: l.draft?.body ?? "",
      }));
      const csv = toCsv(rows, ["name", "company", "email", "website", "title", "subscribers", "notes", "status", "subject", "body"]);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="closeagent-leads.csv"',
        },
      });
    }
    return NextResponse.json({ leads: withLatest });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Import a CSV (multipart field "file"). */
export async function POST(req: Request) {
  try {
    const { supabase, user } = await requireUser();
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
    const { error } = await supabase.from("leads").insert(
      leads.map((l) => ({ ...l, user_id: user.id, source: "csv", email_source: l.email ? "csv" : "" })),
    );
    if (error) throw new Error(error.message);
    return NextResponse.json({ imported: leads.length });
  } catch (err) {
    return errorResponse(err);
  }
}

const Patch = z.object({
  id: z.string().uuid(),
  email: z.string().trim().max(200).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(["new", "drafted", "sent"]).optional(),
});

export async function PATCH(req: Request) {
  try {
    const { supabase } = await requireUser();
    const { id, ...fields } = Patch.parse(await req.json());
    const update: Record<string, string> = { ...fields } as Record<string, string>;
    if (fields.email !== undefined) update.email_source = fields.email ? "manual" : "";
    const { error } = await supabase.from("leads").update(update).eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Invalid update." }, { status: 400 });
    return errorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const { supabase } = await requireUser();
    const ids = z.array(z.string().uuid()).min(1).max(500).parse((await req.json()).ids);
    const { error } = await supabase.from("leads").delete().in("id", ids);
    if (error) throw new Error(error.message);
    return NextResponse.json({ deleted: ids.length });
  } catch (err) {
    return errorResponse(err);
  }
}
