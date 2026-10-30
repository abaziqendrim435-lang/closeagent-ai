import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { SiteFooter, SiteNav } from "@/components/site-chrome";

const audiences = [
  {
    title: "Brands & founders",
    text: "Find YouTubers in your niche for sponsorships, reviews or affiliate deals — without paying an influencer platform.",
  },
  {
    title: "Agencies & freelancers",
    text: "Reach company decision-makers with a first email that shows you actually looked at their business.",
  },
  {
    title: "Affiliate & creator managers",
    text: "Build a pipeline of creators by audience size and topic, then pitch dozens of them in an afternoon.",
  },
];

const steps = [
  {
    title: "Find",
    text: "Search YouTube creators by topic and audience size, or enter company websites. CloseAgent pulls the business emails they publish themselves.",
  },
  {
    title: "Describe your offer once",
    text: "Who you are, what you offer and the one action you want. Affiliate deal, service, product — anything.",
  },
  {
    title: "Get personal drafts",
    text: "One short, specific email per lead that references their niche or latest video. Review, copy, send from your own inbox.",
  },
];

const features = [
  { title: "Creator search", text: "Filter YouTube channels by keyword and subscriber range. See audience size, niche and channel link at a glance." },
  { title: "Public business emails", text: "Emails come from channel pages, video descriptions and company domains — only contact details people chose to publish." },
  { title: "Company decision-makers", text: "Enter a website and get named contacts with role and confidence, ready for B2B outreach." },
  { title: "Drafts that don't sound like AI", text: "Short, specific first emails with a greeting, a real reason to write and one clear ask. No fluff, no invented claims." },
  { title: "Your inbox, your reputation", text: "CloseAgent never sends for you. You review every draft and send from your own email, so your domain stays healthy." },
  { title: "CSV in, CSV out", text: "Import leads you already have, export everything to your CRM or sheet whenever you want." },
];

const faqs = [
  {
    q: "Where do the emails come from?",
    a: "Only from places people publish them for business: a channel's public description, video descriptions, and company domains via a professional email-lookup provider. CloseAgent does not guess private addresses or buy lists.",
  },
  {
    q: "Does CloseAgent send emails for me?",
    a: "No. You review each draft, copy it and send it from your own inbox. That keeps you in control and protects your sender reputation.",
  },
  {
    q: "Is cold outreach legal?",
    a: "In many countries one-to-one business outreach is allowed if it is relevant, honest and lets people opt out — but rules differ (for example CAN-SPAM in the US and GDPR in the EU). You are responsible for following the rules in your recipients' countries.",
  },
  {
    q: "Do I need a credit card for the free trial?",
    a: "No. Create an account and start with the free plan. Upgrade to Pro only when you need more searches, drafts and company lookups.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Pro is billed monthly through Stripe and you can cancel from your account settings at any time. You keep Pro until the end of the paid period.",
  },
];

function ProductPreview() {
  const rows = [
    { name: "Homebrew Lab", subs: "184k", niche: "Coffee gear", email: "collabs@…", on: true },
    { name: "Desk Setup Daily", subs: "62k", niche: "Workspace", email: "business@…", on: false },
    { name: "Trail & Pack", subs: "310k", niche: "Outdoor", email: "hello@…", on: false },
  ];
  return (
    <div className="relative mx-auto mt-14 max-w-4xl">
      <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-r from-[#5b8cff]/20 via-accent/20 to-[#c86dff]/20 blur-3xl" />
      <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-bad/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-ok/70" />
          <span className="ml-3 text-xs text-muted">closeagent · Leads</span>
          <span className="ml-auto rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">
            Example
          </span>
        </div>
        <div className="grid text-left md:grid-cols-[1.1fr_1fr]">
          <div className="border-b border-line p-4 md:border-r md:border-b-0">
            <div className="mb-3 flex gap-2 text-xs">
              <span className="rounded-md border border-line bg-panel-2 px-2 py-1 text-text">“coffee” · 50k–500k subs</span>
              <span className="rounded-md bg-accent/15 px-2 py-1 text-accent">24 found</span>
            </div>
            <div className="space-y-2">
              {rows.map((r) => (
                <div
                  key={r.name}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${r.on ? "border-accent/50 bg-panel-2" : "border-line"}`}
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-2/40 to-accent/40 text-xs font-semibold">
                    {r.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{r.name}</div>
                    <div className="text-xs text-muted">
                      {r.subs} · {r.niche}
                    </div>
                  </div>
                  <span className="rounded-md bg-ok/10 px-2 py-0.5 font-mono text-[11px] text-ok">{r.email}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4">
            <div className="mb-2 text-xs uppercase tracking-wider text-muted">AI draft</div>
            <div className="rounded-lg border border-line bg-[#0a0a13] p-4 text-sm leading-relaxed">
              <div className="mb-2 text-xs text-muted">Subject: Your grinder comparison video</div>
              <p>Hi Sam,</p>
              <p className="mt-2 text-muted">
                Your side-by-side grinder test was the clearest one I&apos;ve seen — especially the part on retention.
              </p>
              <p className="mt-2 text-muted">
                We make a small-batch scale for pour-over. Would you be open to trying one for an honest review? No script.
              </p>
              <p className="mt-2">Best,<br />Alex</p>
            </div>
            <div className="mt-3 flex gap-2">
              <span className="rounded-md bg-accent px-3 py-1.5 text-xs text-white">Copy draft</span>
              <span className="rounded-md border border-line px-3 py-1.5 text-xs text-muted">Regenerate</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const pro = PLANS.pro;
  return (
    <main className="mx-auto max-w-6xl px-4">
      <SiteNav />

      <section className="pt-16 pb-6 text-center sm:pt-24">
        <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Creator & B2B outreach copilot
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Find the right people. <span className="gradient-text">Write to them like a human.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-muted sm:text-lg">
          CloseAgent finds YouTube creators and company decision-makers with their public business emails, then writes a
          personal first email for each one — in minutes, not evenings.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href="/login?mode=signup"
            className="rounded-lg bg-gradient-to-r from-[#5b8cff] via-accent to-[#c86dff] px-6 py-3 text-sm font-medium text-white shadow-[0_0_30px_rgba(139,109,255,0.4)] hover:brightness-110"
          >
            Start free — no card
          </Link>
          <a href="#how" className="rounded-lg border border-line px-6 py-3 text-sm hover:border-accent">
            See how it works
          </a>
        </div>
        <p className="mt-4 text-xs text-muted">Free plan included · Cancel Pro anytime</p>
        <ProductPreview />
      </section>

      <section className="mt-24">
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">Built for people who live on outreach</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {audiences.map((a) => (
            <div key={a.title} className="rounded-xl border border-line bg-panel p-6">
              <h3 className="mb-2 font-semibold">{a.title}</h3>
              <p className="text-sm text-muted">{a.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="mt-24 scroll-mt-24">
        <p className="text-center text-xs uppercase tracking-[0.25em] text-accent-2">How it works</p>
        <h2 className="mt-3 text-center text-2xl font-semibold sm:text-3xl">From zero to ready-to-send in three steps</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="rounded-xl border border-line bg-panel p-6">
              <div className="mb-4 grid h-9 w-9 place-items-center rounded-lg bg-accent/15 font-mono text-sm text-accent">
                0{i + 1}
              </div>
              <h3 className="mb-2 font-semibold">{s.title}</h3>
              <p className="text-sm text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mt-24 scroll-mt-24">
        <p className="text-center text-xs uppercase tracking-[0.25em] text-accent-2">Features</p>
        <h2 className="mt-3 text-center text-2xl font-semibold sm:text-3xl">Everything you need for the first email</h2>
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="bg-panel p-6">
              <h3 className="mb-2 font-semibold">{f.title}</h3>
              <p className="text-sm text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mt-24 scroll-mt-24">
        <p className="text-center text-xs uppercase tracking-[0.25em] text-accent-2">Pricing</p>
        <h2 className="mt-3 text-center text-2xl font-semibold sm:text-3xl">Simple, monthly, cancel anytime</h2>
        <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
          {(["free", "pro"] as const).map((id) => {
            const p = PLANS[id];
            const isPro = id === "pro";
            return (
              <div
                key={id}
                className={`relative rounded-2xl border p-7 ${isPro ? "border-accent/60 bg-panel-2 shadow-[0_0_40px_rgba(139,109,255,0.15)]" : "border-line bg-panel"}`}
              >
                {isPro && (
                  <span className="absolute -top-3 right-6 rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">
                    Most popular
                  </span>
                )}
                <div className="text-sm text-muted">{p.name}</div>
                <div className="mt-1 text-4xl font-semibold">{p.price}</div>
                <ul className="mt-6 space-y-3 text-sm">
                  {[
                    `${p.limits.searches} creator searches / month`,
                    `${p.limits.drafts} AI drafts / month`,
                    p.limits.lookups ? `${p.limits.lookups} company lookups / month` : null,
                    "CSV import & export",
                  ]
                    .filter(Boolean)
                    .map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="text-ok">✓</span>
                        <span className="text-muted">{item}</span>
                      </li>
                    ))}
                  {!p.limits.lookups && (
                    <li className="flex gap-2">
                      <span className="text-muted/60">—</span>
                      <span className="text-muted/60">No company lookups</span>
                    </li>
                  )}
                </ul>
                <Link
                  href="/login?mode=signup"
                  className={`mt-7 block rounded-lg px-4 py-2.5 text-center text-sm font-medium ${isPro ? "bg-gradient-to-r from-[#5b8cff] via-accent to-[#c86dff] text-white" : "border border-line hover:border-accent"}`}
                >
                  {isPro ? `Get Pro — ${pro.price}` : "Try it free"}
                </Link>
              </div>
            );
          })}
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted">
          Payments are processed securely by Stripe. CloseAgent only uses contact details people publish themselves and
          never sends email for you.
        </p>
      </section>

      <section id="faq" className="mx-auto mt-24 max-w-3xl scroll-mt-24">
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">Questions</h2>
        <div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-panel">
          {faqs.map((f) => (
            <details key={f.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {f.q}
                <span className="text-muted transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-24 overflow-hidden rounded-3xl border border-accent/40 bg-gradient-to-br from-[#5b8cff]/15 via-accent/15 to-[#c86dff]/15 px-6 py-14 text-center">
        <h2 className="mx-auto max-w-2xl text-2xl font-semibold sm:text-4xl">Your next 50 outreach emails, done tonight.</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted">Start on the free plan. No credit card required.</p>
        <Link
          href="/login?mode=signup"
          className="mt-8 inline-block rounded-lg bg-white px-6 py-3 text-sm font-medium text-[#07070d] hover:bg-white/90"
        >
          Create free account
        </Link>
      </section>

      <SiteFooter />
    </main>
  );
}
