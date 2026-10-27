import assert from "node:assert/strict";
import { test } from "node:test";
import { writeDrafts, __test } from "../src/lib/drafts";

const offer = { senderName: "Qendrim", senderCompany: "CloseAgent.ai", offer: "30% affiliate", cta: "Reply yes", language: "English" };
const lead = (i: number) => ({ id: `id${i}`, name: `N${i}`, company: "C", title: "YouTube creator", website: "", notes: "recent video: X", subscribers: 12000 });

test("prompt includes facts, sign-off and opt-out", () => {
  const p = __test.buildPrompt(offer, [lead(1)]);
  assert.match(p, /about 12,000 subscribers/);
  assert.match(p, /Qendrim — CloseAgent\.ai/);
  assert.match(p, /won't follow up/);
});

test("writeDrafts batches by 5 and maps results", async () => {
  process.env.OPENAI_API_KEY = "sk-test";
  let calls = 0;
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    calls++;
    const body = JSON.parse(String(init.body));
    const n = (body.messages[1].content.match(/^Target \d+:/gm) || []).length;
    const content = JSON.stringify({ emails: Array.from({ length: n }, (_, i) => ({ angle: "fit", subject: `Subject: hi ${i}`, body: "Body" })) });
    return new Response(JSON.stringify({ id: "x", object: "chat.completion", created: 0, model: "m", choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content } }] }), { headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const out = await writeDrafts(offer, Array.from({ length: 12 }, (_, i) => lead(i)));
  assert.equal(calls, 3);
  assert.equal(out.length, 12);
  assert.equal(out[0].subject, "hi 0");
  assert.equal(out[11].leadId, "id11");
});
