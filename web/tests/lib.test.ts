import assert from "node:assert/strict";
import { test } from "node:test";
import { extractEmails, pickBestEmail } from "../src/lib/emails";
import { csvToLeads, toCsv } from "../src/lib/csv";
import { isPlatformDomain, normalizeDomain } from "../src/lib/hunter";
import { findCreators } from "../src/lib/youtube";

test("extracts plain and obfuscated emails, ignores junk", () => {
  const text = "Business: collab@alexai.com | personal alex [at] gmail [dot] com | noreply@youtube.com | img@2x.png";
  const emails = extractEmails(text);
  assert.ok(emails.includes("collab@alexai.com"));
  assert.ok(emails.includes("alex@gmail.com"));
  assert.ok(!emails.some((e) => e.startsWith("noreply")));
  assert.equal(pickBestEmail(["alex@gmail.com", "collab@alexai.com"]), "collab@alexai.com");
});

test("csv with semicolons, quotes and aliases", () => {
  const leads = csvToLeads('Company Name;Target Email;Notes\nApple;x@y.com;"a; b ""quoted"""\n');
  assert.equal(leads.length, 1);
  assert.equal(leads[0].company, "Apple");
  assert.equal(leads[0].email, "x@y.com");
  assert.equal(leads[0].notes, 'a; b "quoted"');
  assert.match(toCsv([{ a: 'x,"y"' }], ["a"]), /"x,""y"""/);
});

test("domain helpers", () => {
  assert.equal(normalizeDomain("https://www.Acme.io/about"), "acme.io");
  assert.ok(isPlatformDomain("youtube.com"));
  assert.ok(isPlatformDomain("m.youtube.com"));
  assert.ok(!isPlatformDomain("acme.io"));
});

test("findCreators filters by size, extracts emails, sorts email-first", async () => {
  process.env.YOUTUBE_API_KEY = "k";
  const calls: string[] = [];
  globalThis.fetch = (async (url: string) => {
    calls.push(url);
    const u = new URL(url);
    if (u.pathname.endsWith("/search")) {
      return new Response(JSON.stringify({ items: [
        { id: { videoId: "v1" }, snippet: { channelId: "A", title: "Cold email &amp; AI", publishedAt: "" } },
        { id: { videoId: "v2" }, snippet: { channelId: "B", title: "Freelance tips", publishedAt: "" } },
        { id: { videoId: "v3" }, snippet: { channelId: "C", title: "Huge channel", publishedAt: "" } },
      ] }));
    }
    return new Response(JSON.stringify({ items: [
      { id: "A", snippet: { title: "Alex AI", description: "no email here", customUrl: "@alexai" }, statistics: { subscriberCount: "20000" } },
      { id: "B", snippet: { title: "Bea Builds", description: "Business inquiries: hello@beabuilds.co" }, statistics: { subscriberCount: "15000" } },
      { id: "C", snippet: { title: "Mega", description: "biz@mega.com" }, statistics: { subscriberCount: "5000000" } },
    ] }));
  }) as typeof fetch;
  const res = await findCreators({ query: "cold email", minSubscribers: 10000, maxSubscribers: 100000 });
  assert.deepEqual(res.map((r) => r.name), ["Bea Builds", "Alex AI"]);
  assert.equal(res[0].email, "hello@beabuilds.co");
  assert.equal(res[1].email, "");
  assert.equal(res[1].url, "https://www.youtube.com/@alexai");
  assert.equal(res[1].recentVideoTitle, "Cold email & AI");
  assert.ok(calls[0].includes("type=video"));
});
