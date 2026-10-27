import OpenAI from "openai";
import { env } from "@/lib/env";

export interface DraftLead {
  id: string;
  name: string;
  company: string;
  title: string;
  website: string;
  notes: string;
  subscribers: number | null;
}

export interface Offer {
  senderName: string;
  senderCompany: string;
  offer: string;
  cta: string;
  language: string;
}

export interface DraftResult {
  leadId: string;
  angle: string;
  subject: string;
  body: string;
}

const BATCH = 5;

function buildPrompt(offer: Offer, leads: DraftLead[]): string {
  const targets = leads
    .map((l, i) =>
      [
        `Target ${i + 1}:`,
        `- Name: ${l.name || "Unknown"}`,
        `- Company/Channel: ${l.company || "Unknown"}`,
        `- Role: ${l.title || "Unknown"}`,
        l.subscribers ? `- Audience: about ${l.subscribers.toLocaleString("en-US")} subscribers` : "",
        `- Website: ${l.website || "n/a"}`,
        `- Facts: ${l.notes || "n/a"}`,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
  const signOff = offer.senderCompany ? `${offer.senderName} — ${offer.senderCompany}` : offer.senderName;

  return `You write first-touch outreach emails for a real person.

SENDER
- Name: ${offer.senderName || "the sender"}
- Company: ${offer.senderCompany || "n/a"}
- Offer: ${offer.offer}
- Call to action: ${offer.cta || "a short reply if they are interested"}

TARGETS
${targets}

For EACH target:
1. "angle": one sentence on why this specific person is a good fit for the offer, based only on the facts.
2. "subject": 3–7 words, specific to them, sounds human. No hype words (Boost, Unlock, Supercharge, Game-changer, Opportunity).
3. "body": 70–120 words, plain text, no subject line inside.

Rules for the body:
- First sentence references a concrete fact above (their niche, audience, a recent video title). Never open with "I loved", "I hope", "I came across", "Just reaching out".
- 1–2 sentences explaining the offer, framed around what THEY get.
- Honest: never invent results, clients, numbers, events or quotes that are not in the facts.
- One call to action: ${offer.cta || "a short reply"}
- Then this exact line: "If this isn't relevant, just reply 'no' and I won't follow up."
- Sign off: "${signOff || "Best"}"
- Friendly, human tone. Language: ${offer.language || "English"}.

Return JSON: {"emails":[{"angle":"...","subject":"...","body":"..."}]} with exactly ${leads.length} items in the same order.`;
}

export async function writeDrafts(offer: Offer, leads: DraftLead[]): Promise<DraftResult[]> {
  const client = new OpenAI({ apiKey: env.openaiKey() });
  const out: DraftResult[] = [];
  for (let i = 0; i < leads.length; i += BATCH) {
    const batch = leads.slice(i, i + BATCH);
    const completion = await client.chat.completions.create({
      model: env.openaiModel(),
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You write honest, specific, human outreach emails. Reply with valid JSON only." },
        { role: "user", content: buildPrompt(offer, batch) },
      ],
    });
    const text = completion.choices[0]?.message?.content ?? "{}";
    let items: Array<{ angle?: string; subject?: string; body?: string }> = [];
    try {
      const parsed = JSON.parse(text);
      items = Array.isArray(parsed.emails) ? parsed.emails : [];
    } catch {
      items = [];
    }
    batch.forEach((lead, idx) => {
      const item = items[idx];
      if (item?.body) {
        out.push({
          leadId: lead.id,
          angle: String(item.angle ?? "").trim(),
          subject: String(item.subject ?? "").replace(/^subject:\s*/i, "").trim(),
          body: String(item.body).trim(),
        });
      }
    });
  }
  return out;
}

export const __test = { buildPrompt };
