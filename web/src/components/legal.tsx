import type { ReactNode } from "react";
import { SiteFooter, SiteNav } from "@/components/site-chrome";
import { SITE } from "@/lib/site";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl px-4">
      <SiteNav />
      <article className="mx-auto max-w-3xl pt-14">
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated: {SITE.legalUpdated}</p>
        <div className="legal mt-10 space-y-4 text-[15px] leading-relaxed text-muted">{children}</div>
      </article>
      <SiteFooter />
    </main>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="pt-6 text-lg font-semibold text-text">{children}</h2>;
}

export function ContactLine() {
  return (
    <p>
      {SITE.company}, {SITE.address}
      {SITE.supportEmail && (
        <>
          {" "}
          · <a className="text-accent hover:underline" href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>
        </>
      )}
    </p>
  );
}
