import Link from "next/link";
import { SITE } from "@/lib/site";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-wide">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#5b8cff] via-accent to-[#c86dff] text-xs font-bold text-white">
        C
      </span>
      <span>
        Close<span className="gradient-text">Agent</span>
      </span>
    </Link>
  );
}

export function SiteNav() {
  return (
    <nav className="sticky top-0 z-20 -mx-4 flex items-center justify-between border-b border-transparent bg-bg/70 px-4 py-4 backdrop-blur-md">
      <Logo />
      <div className="flex items-center gap-1 text-sm sm:gap-2">
        <Link href="/#features" className="hidden rounded-lg px-3 py-2 text-muted hover:text-text sm:block">
          Features
        </Link>
        <Link href="/#pricing" className="hidden rounded-lg px-3 py-2 text-muted hover:text-text sm:block">
          Pricing
        </Link>
        <Link href="/#faq" className="hidden rounded-lg px-3 py-2 text-muted hover:text-text sm:block">
          FAQ
        </Link>
        <Link href="/login" className="rounded-lg px-3 py-2 text-muted hover:text-text">
          Sign in
        </Link>
        <Link
          href="/login?mode=signup"
          className="rounded-lg bg-gradient-to-r from-[#5b8cff] via-accent to-[#c86dff] px-4 py-2 font-medium text-white"
        >
          Start free
        </Link>
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line pt-10 pb-12 text-sm text-muted">
      <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3">Find creators and decision-makers, then write outreach that sounds like you.</p>
        </div>
        <div className="grid grid-cols-2 gap-10">
          <div className="space-y-2">
            <div className="font-medium text-text">Product</div>
            <Link href="/#features" className="block hover:text-text">Features</Link>
            <Link href="/#pricing" className="block hover:text-text">Pricing</Link>
            <Link href="/#faq" className="block hover:text-text">FAQ</Link>
            <Link href="/login" className="block hover:text-text">Sign in</Link>
          </div>
          <div className="space-y-2">
            <div className="font-medium text-text">Company</div>
            <Link href="/terms" className="block hover:text-text">Terms of Service</Link>
            <Link href="/privacy" className="block hover:text-text">Privacy Policy</Link>
            {SITE.supportEmail && (
              <a href={`mailto:${SITE.supportEmail}`} className="block hover:text-text">Contact</a>
            )}
          </div>
        </div>
      </div>
      <div className="mt-10 border-t border-line pt-6 text-xs">
        © {new Date().getFullYear()} {SITE.company}. All rights reserved. CloseAgent is a product of {SITE.company}.
      </div>
    </footer>
  );
}
