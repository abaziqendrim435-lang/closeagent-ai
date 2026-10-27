import { NextResponse } from "next/server";
import { z } from "zod";
import { addUsage, assertQuota, errorResponse, requireUser } from "@/lib/account";
import { findCreators } from "@/lib/youtube";

const Body = z.object({
  query: z.string().trim().min(2).max(120),
  minSubscribers: z.number().int().min(0).optional(),
  maxSubscribers: z.number().int().min(0).optional(),
  maxResults: z.number().int().min(1).max(50).optional(),
  regionCode: z.string().length(2).optional(),
  language: z.string().min(2).max(5).optional(),
  onlyWithEmail: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const { supabase, user, profile } = await requireUser();
    const input = Body.parse(await req.json());
    await assertQuota(user.id, profile?.subscription_status, "searches", 1);

    let creators = await findCreators(input);
    await addUsage(user.id, "searches", 1);
    if (input.onlyWithEmail) creators = creators.filter((c) => c.email);

    if (creators.length) {
      const rows = creators.map((c) => ({
        user_id: user.id,
        source: "youtube",
        external_id: c.channelId,
        name: c.name,
        company: c.name,
        email: c.email,
        email_source: c.email ? "youtube_description" : "",
        website: c.url,
        title: "YouTube creator",
        subscribers: c.subscribers,
        notes: [
          c.subscribers ? `${c.subscribers.toLocaleString("en-US")} subscribers` : "",
          c.recentVideoTitle ? `recent video: "${c.recentVideoTitle}"` : "",
          c.country ? `country: ${c.country}` : "",
          c.description ? `about: ${c.description.replace(/\s+/g, " ").slice(0, 300)}` : "",
        ]
          .filter(Boolean)
          .join("; "),
      }));
      const { error } = await supabase
        .from("leads")
        .upsert(rows, { onConflict: "user_id,source,external_id", ignoreDuplicates: false });
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({
      found: creators.length,
      withEmail: creators.filter((c) => c.email).length,
      creators,
    });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Invalid search." }, { status: 400 });
    return errorResponse(err);
  }
}
