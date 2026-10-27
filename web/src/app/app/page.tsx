"use client";

import Link from "next/link";
import { useState } from "react";
import { refreshUsage } from "@/components/app-shell";
import { Button, Card, Field, Input, Notice, api, formatCount } from "@/components/ui";

interface Creator {
  channelId: string;
  name: string;
  url: string;
  subscribers: number | null;
  country: string;
  email: string;
  recentVideoTitle: string;
}

const SIZES = [
  { label: "Any size", min: 0, max: 0 },
  { label: "1k – 10k", min: 1_000, max: 10_000 },
  { label: "10k – 100k", min: 10_000, max: 100_000 },
  { label: "100k – 1M", min: 100_000, max: 1_000_000 },
];

export default function FindCreators() {
  const [query, setQuery] = useState("");
  const [size, setSize] = useState(2);
  const [language, setLanguage] = useState("en");
  const [onlyWithEmail, setOnlyWithEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ found: number; withEmail: number; creators: Creator[] } | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const s = SIZES[size];
      const data = await api<typeof result>("/api/find/creators", {
        method: "POST",
        body: JSON.stringify({
          query,
          minSubscribers: s.min || undefined,
          maxSubscribers: s.max || undefined,
          language: language || undefined,
          onlyWithEmail,
          maxResults: 30,
        }),
      });
      setResult(data);
      refreshUsage();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Find creators</h1>
        <p className="mt-1 text-sm text-muted">
          Search YouTube creators who recently posted about a topic. Business emails come from what they publish in
          their channel description.
        </p>
      </header>

      <Card>
        <form onSubmit={search} className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
          <Field label="Topic or niche">
            <Input
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. cold email for freelancers, AI tools, agency growth"
            />
          </Field>
          <Field label="Audience size">
            <select
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="rounded-lg border border-line bg-[#0a0a13] px-3 py-2 text-sm"
            >
              {SIZES.map((s, i) => (
                <option key={s.label} value={i}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Language">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-lg border border-line bg-[#0a0a13] px-3 py-2 text-sm"
            >
              <option value="en">English</option>
              <option value="de">German</option>
              <option value="tr">Turkish</option>
              <option value="sq">Albanian</option>
              <option value="es">Spanish</option>
              <option value="">Any</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm text-muted md:col-span-2">
            <input type="checkbox" checked={onlyWithEmail} onChange={(e) => setOnlyWithEmail(e.target.checked)} />
            Only show creators with a public business email
          </label>
          <Button type="submit" disabled={loading}>
            {loading ? "Searching YouTube…" : "Find creators"}
          </Button>
        </form>
      </Card>

      {error && <Notice tone="bad">{error}</Notice>}

      {result && (
        <>
          <Notice tone={result.withEmail ? "ok" : "warn"}>
            Found {result.found} creators, {result.withEmail} with a public business email. They were saved to{" "}
            <Link href="/app/leads" className="underline">
              Leads & drafts
            </Link>
            .
          </Notice>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-panel-2 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Creator</th>
                  <th className="px-4 py-3">Subscribers</th>
                  <th className="px-4 py-3">Business email</th>
                  <th className="px-4 py-3">Recent video</th>
                </tr>
              </thead>
              <tbody>
                {result.creators.map((c) => (
                  <tr key={c.channelId} className="border-t border-line align-top">
                    <td className="px-4 py-3">
                      <a href={c.url} target="_blank" rel="noreferrer" className="font-medium hover:text-accent">
                        {c.name}
                      </a>
                      {c.country && <div className="text-xs text-muted">{c.country}</div>}
                    </td>
                    <td className="px-4 py-3 text-muted">{formatCount(c.subscribers)}</td>
                    <td className="px-4 py-3">
                      {c.email ? <span className="text-ok">{c.email}</span> : <span className="text-muted">not public — DM them</span>}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-muted">{c.recentVideoTitle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
