import Link from "next/link";
import { PLANS } from "@/lib/plans";

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

export default function Home() {
  const pro = PLANS.pro;
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <nav className="flex items-center justify-between py-6">
        <span className="text-lg font-semibold tracking-wide">
          Close<span className="gradient-text">Agent</span>
        </span>
        <Link href="/login" className="rounded-lg border border-line px-4 py-2 text-sm hover:border-accent">
          Sign in
        </Link>
      </nav>

      <section className="pt-14 pb-16 text-center">
        <p className="mb-4 text-xs uppercase tracking-[0.25em] text-accent-2">Creator & B2B outreach copilot</p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
          Find the right people. <span className="gradient-text">Write to them like a human.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted">
          CloseAgent finds YouTube creators and company decision-makers with their public business emails, then writes a
          personal first email for each one — in minutes, not evenings.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-gradient-to-r from-[#5b8cff] via-accent to-[#c86dff] px-6 py-3 text-sm font-medium text-white shadow-[0_0_30px_rgba(139,109,255,0.4)]"
          >
            Start free — no card
          </Link>
          <a href="#pricing" className="rounded-lg border border-line px-6 py-3 text-sm hover:border-accent">
            See pricing
          </a>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="rounded-xl border border-line bg-panel p-5">
            <div className="mb-3 text-xs font-mono text-accent">0{i + 1}</div>
            <h3 className="mb-2 font-semibold">{s.title}</h3>
            <p className="text-sm text-muted">{s.text}</p>
          </div>
        ))}
      </section>

      <section id="pricing" className="mt-20">
        <h2 className="mb-6 text-center text-2xl font-semibold">Simple pricing</h2>
        <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
          {(["free", "pro"] as const).map((id) => {
            const p = PLANS[id];
            return (
              <div
                key={id}
                className={`rounded-xl border p-6 ${id === "pro" ? "border-accent/60 bg-panel-2" : "border-line bg-panel"}`}
              >
                <div className="text-sm text-muted">{p.name}</div>
                <div className="mt-1 text-3xl font-semibold">{p.price}</div>
                <ul className="mt-4 space-y-2 text-sm text-muted">
                  <li>{p.limits.searches} creator searches / month</li>
                  <li>{p.limits.drafts} AI drafts / month</li>
                  <li>{p.limits.lookups ? `${p.limits.lookups} company lookups / month` : "No company lookups"}</li>
                  <li>CSV import & export</li>
                </ul>
                <Link
                  href="/login"
                  className={`mt-6 block rounded-lg px-4 py-2 text-center text-sm ${id === "pro" ? "bg-accent text-white" : "border border-line"}`}
                >
                  {id === "pro" ? `Get Pro — ${pro.price}` : "Try it free"}
                </Link>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          CloseAgent only uses contact details people publish themselves and never sends email for you. You review every
          draft and are responsible for following email laws (CAN-SPAM, GDPR) in your recipients&apos; countries.
        </p>
      </section>
    </main>
  );
}
