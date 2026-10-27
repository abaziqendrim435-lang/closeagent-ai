import { NextResponse } from "next/server";
import { z } from "zod";
import { addUsage, assertQuota, errorResponse, requireUser } from "@/lib/account";
import { findCompanyContacts, isPlatformDomain, normalizeDomain, type CompanyContact } from "@/lib/hunter";
import { upsertLeads } from "@/lib/leads";

const Body = z.object({
  domains: z.array(z.string().trim().min(3).max(200)).min(1).max(25),
  perCompany: z.number().int().min(1).max(3).optional(),
});

export async function POST(req: Request) {
  try {
    const { user, profile } = await requireUser();
    const input = Body.parse(await req.json());
    const domains = [...new Set(input.domains.map(normalizeDomain).filter(Boolean))];
    const skipped = domains.filter(isPlatformDomain);
    const targets = domains.filter((d) => !isPlatformDomain(d));
    if (!targets.length) {
      return NextResponse.json({ error: "Enter company websites (not YouTube/Instagram/Gmail links)." }, { status: 400 });
    }
    await assertQuota(user.id, profile.subscription_status, "lookups", targets.length);

    const contacts: CompanyContact[] = [];
    const noResults: string[] = [];
    let used = 0;
    for (const domain of targets) {
      try {
        const found = await findCompanyContacts(domain, input.perCompany ?? 1);
        used++;
        if (found.length) contacts.push(...found);
        else noResults.push(domain);
      } catch (err) {
        if (used === 0) throw err;
        noResults.push(domain);
      }
    }
    await addUsage(user.id, "lookups", used);

    await upsertLeads(
      user.id,
      contacts.map((c) => ({
        source: "hunter",
        external_id: c.email,
        name: c.name || c.company,
        company: c.company,
        email: c.email,
        email_source: "hunter",
        website: `https://${c.domain}`,
        title: c.title,
        notes: c.verification ? `email verification: ${c.verification}` : "",
        subscribers: null,
      })),
    );
    return NextResponse.json({ contacts, noResults, skipped });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    return errorResponse(err);
  }
}
