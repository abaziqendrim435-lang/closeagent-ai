"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api } from "@/components/ui";
import { authClient } from "@/lib/auth/client";

interface Settings {
  plan: "free" | "pro";
  limits: { searches: number; drafts: number; lookups: number };
  usage: { searches: number; drafts: number; lookups: number };
  profile: { email: string | null } | null;
}

const NAV = [
  { href: "/app", label: "Find creators" },
  { href: "/app/companies", label: "Find companies" },
  { href: "/app/leads", label: "Leads & drafts" },
  { href: "/app/settings", label: "Offer & billing" },
];

/** Call after an action that spends quota so the sidebar meter updates. */
export function refreshUsage() {
  window.dispatchEvent(new Event("closeagent:usage"));
}

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span>{limit ? `${used}/${limit}` : "Pro only"}</span>
      </div>
      <div className="h-1.5 rounded-full bg-line">
        <div className="h-1.5 rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [s, setS] = useState<Settings | null>(null);

  const load = useCallback(() => {
    api<Settings>("/api/settings").then(setS).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("closeagent:usage", load);
    return () => window.removeEventListener("closeagent:usage", load);
  }, [load]);

  async function signOut() {
    await authClient.signOut();
    router.push("/");
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row">
      <aside className="md:w-56 md:shrink-0">
        <Link href="/app" className="mb-6 block text-lg font-semibold">
          Close<span className="gradient-text">Agent</span>
        </Link>
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${
                path === n.href ? "bg-panel-2 text-text" : "text-muted hover:text-text"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        {s && (
          <div className="mt-6 hidden space-y-3 rounded-xl border border-line bg-panel p-4 md:block">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Plan</span>
              <span className={s.plan === "pro" ? "text-accent" : "text-warn"}>{s.plan === "pro" ? "Pro" : "Free trial"}</span>
            </div>
            <Meter label="Searches" used={s.usage.searches} limit={s.limits.searches} />
            <Meter label="AI drafts" used={s.usage.drafts} limit={s.limits.drafts} />
            <Meter label="Company lookups" used={s.usage.lookups} limit={s.limits.lookups} />
            {s.plan === "free" && (
              <Link href="/app/settings" className="block rounded-lg bg-accent px-3 py-2 text-center text-xs font-medium text-white">
                Upgrade to Pro
              </Link>
            )}
          </div>
        )}
        <button onClick={signOut} className="mt-4 hidden text-xs text-muted hover:text-text md:block">
          Sign out {s?.profile?.email ? `(${s.profile.email})` : ""}
        </button>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
