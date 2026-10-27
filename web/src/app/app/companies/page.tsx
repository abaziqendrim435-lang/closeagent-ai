"use client";

import Link from "next/link";
import { useState } from "react";
import { refreshUsage } from "@/components/app-shell";
import { Button, Card, Field, Notice, Textarea, api } from "@/components/ui";

interface Contact {
  domain: string;
  company: string;
  name: string;
  title: string;
  email: string;
  verification: string;
}

export default function FindCompanies() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ contacts: Contact[]; noResults: string[]; skipped: string[] } | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const domains = text
      .split(/[\s,;]+/)
      .map((d) => d.trim())
      .filter(Boolean)
      .slice(0, 25);
    setLoading(true);
    setError("");
    try {
      const data = await api<typeof result>("/api/find/companies", {
        method: "POST",
        body: JSON.stringify({ domains, perCompany: 1 }),
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
        <h1 className="text-2xl font-semibold">Find companies</h1>
        <p className="mt-1 text-sm text-muted">
          Paste company websites. CloseAgent finds a senior decision-maker and their published work email (via Hunter.io).
          One lookup per website.
        </p>
      </header>
      <Card>
        <form onSubmit={search} className="space-y-4">
          <Field label="Company websites" hint="One per line, up to 25. Social profiles and Gmail addresses are skipped.">
            <Textarea
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"acme-studio.com\nbrightagency.io\nnorthfreight.de"}
              className="min-h-36 font-mono"
            />
          </Field>
          <Button type="submit" disabled={loading}>
            {loading ? "Looking up…" : "Find decision-makers"}
          </Button>
        </form>
      </Card>

      {error && <Notice tone="bad">{error}</Notice>}
      {result && (
        <>
          <Notice tone={result.contacts.length ? "ok" : "warn"}>
            Found {result.contacts.length} contacts. Saved to{" "}
            <Link href="/app/leads" className="underline">
              Leads & drafts
            </Link>
            .{result.noResults.length ? ` No contact found for: ${result.noResults.join(", ")}.` : ""}
            {result.skipped.length ? ` Skipped: ${result.skipped.join(", ")}.` : ""}
          </Notice>
          {result.contacts.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-left text-sm">
                <thead className="bg-panel-2 text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Person</th>
                    <th className="px-4 py-3">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {result.contacts.map((c) => (
                    <tr key={c.email} className="border-t border-line">
                      <td className="px-4 py-3">
                        {c.company}
                        <div className="text-xs text-muted">{c.domain}</div>
                      </td>
                      <td className="px-4 py-3">
                        {c.name || "—"}
                        <div className="text-xs text-muted">{c.title}</div>
                      </td>
                      <td className="px-4 py-3 text-ok">
                        {c.email}
                        {c.verification && <div className="text-xs text-muted">{c.verification}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
