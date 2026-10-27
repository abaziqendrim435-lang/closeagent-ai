"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { refreshUsage } from "@/components/app-shell";
import { Button, Notice, api, formatCount } from "@/components/ui";

interface Draft {
  subject: string;
  body: string;
  angle: string;
}
interface Lead {
  id: string;
  source: string;
  name: string;
  company: string;
  email: string;
  email_source: string;
  website: string;
  title: string;
  notes: string;
  subscribers: number | null;
  status: string;
  draft: Draft | null;
}

function mailto(lead: Lead) {
  if (!lead.email || !lead.draft) return "";
  return `mailto:${lead.email}?subject=${encodeURIComponent(lead.draft.subject)}&body=${encodeURIComponent(lead.draft.body)}`;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "bad" | "warn"; text: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "email" | "noemail">("all");

  const load = useCallback(async () => {
    try {
      const data = await api<{ leads: Lead[] }>("/api/leads");
      setLeads(data.leads);
    } catch (err) {
      setMessage({ tone: "bad", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api<{ leads: Lead[] }>("/api/leads")
      .then((data) => active && setLeads(data.leads))
      .catch((err) => active && setMessage({ tone: "bad", text: (err as Error).message }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(
    () => leads.filter((l) => (filter === "all" ? true : filter === "email" ? !!l.email : !l.email)),
    [leads, filter],
  );

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function generate() {
    const ids = [...selected].slice(0, 50);
    setBusy(true);
    setMessage(null);
    try {
      const data = await api<{ drafts: unknown[]; missing: number }>("/api/drafts", {
        method: "POST",
        body: JSON.stringify({ leadIds: ids }),
      });
      setMessage({
        tone: data.missing ? "warn" : "ok",
        text: `Wrote ${data.drafts.length} drafts${data.missing ? ` (${data.missing} failed — try again)` : ""}.`,
      });
      setSelected(new Set());
      refreshUsage();
      await load();
    } catch (err) {
      setMessage({ tone: "bad", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function saveEmail(lead: Lead, email: string) {
    if (email === lead.email) return;
    await api("/api/leads", { method: "PATCH", body: JSON.stringify({ id: lead.id, email }) });
    setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, email } : l)));
  }

  async function markSent(lead: Lead) {
    await api("/api/leads", { method: "PATCH", body: JSON.stringify({ id: lead.id, status: "sent" }) });
    setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, status: "sent" } : l)));
  }

  async function remove() {
    const ids = [...selected];
    if (!ids.length) return;
    await api("/api/leads", { method: "DELETE", body: JSON.stringify({ ids }) });
    setSelected(new Set());
    await load();
  }

  async function importCsv(file: File) {
    const form = new FormData();
    form.append("file", file);
    try {
      const data = await api<{ imported: number }>("/api/leads", { method: "POST", body: form });
      setMessage({ tone: "ok", text: `Imported ${data.imported} leads.` });
      await load();
    } catch (err) {
      setMessage({ tone: "bad", text: (err as Error).message });
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Leads & drafts</h1>
          <p className="mt-1 text-sm text-muted">Select leads, write drafts, then open each one in your mail app.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer rounded-lg border border-line bg-panel-2 px-4 py-2 text-sm hover:border-accent/60">
            Import CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
          </label>
          <a href="/api/leads?format=csv" className="rounded-lg border border-line bg-panel-2 px-4 py-2 text-sm hover:border-accent/60">
            Export CSV
          </a>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={generate} disabled={busy || selected.size === 0}>
          {busy ? "Writing…" : `Write drafts for ${selected.size} selected`}
        </Button>
        <Button variant="danger" onClick={remove} disabled={selected.size === 0}>
          Delete
        </Button>
        <div className="ml-auto flex gap-1 text-xs">
          {(["all", "email", "noemail"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 ${filter === f ? "bg-panel-2 text-text" : "text-muted"}`}
            >
              {f === "all" ? "All" : f === "email" ? "With email" : "No email"}
            </button>
          ))}
        </div>
      </div>

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : leads.length === 0 ? (
        <Notice tone="info">
          No leads yet. <Link href="/app" className="underline">Find creators</Link> or import a CSV.
        </Notice>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel-2 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={visible.length > 0 && visible.every((l) => selected.has(l.id))}
                    onChange={(e) => setSelected(e.target.checked ? new Set(visible.map((l) => l.id)) : new Set())}
                  />
                </th>
                <th className="px-3 py-3">Lead</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((l) => (
                <LeadRow
                  key={l.id}
                  lead={l}
                  checked={selected.has(l.id)}
                  onToggle={() => toggle(l.id)}
                  open={open === l.id}
                  onOpen={() => setOpen(open === l.id ? null : l.id)}
                  onSaveEmail={(e) => saveEmail(l, e)}
                  onSent={() => markSent(l)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LeadRow({
  lead,
  checked,
  onToggle,
  open,
  onOpen,
  onSaveEmail,
  onSent,
}: {
  lead: Lead;
  checked: boolean;
  onToggle: () => void;
  open: boolean;
  onOpen: () => void;
  onSaveEmail: (email: string) => void;
  onSent: () => void;
}) {
  const [email, setEmail] = useState(lead.email);
  const [copied, setCopied] = useState(false);
  const statusColor = { new: "text-muted", drafted: "text-accent-2", sent: "text-ok" }[lead.status] ?? "text-muted";

  async function copy() {
    if (!lead.draft) return;
    await navigator.clipboard.writeText(`Subject: ${lead.draft.subject}\n\n${lead.draft.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <tr className="border-t border-line align-top">
        <td className="px-3 py-3">
          <input type="checkbox" checked={checked} onChange={onToggle} aria-label={`Select ${lead.name}`} />
        </td>
        <td className="px-3 py-3">
          <a href={lead.website || undefined} target="_blank" rel="noreferrer" className="font-medium hover:text-accent">
            {lead.name || lead.company}
          </a>
          <div className="text-xs text-muted">
            {[lead.title, lead.company !== lead.name ? lead.company : "", lead.subscribers ? `${formatCount(lead.subscribers)} subs` : ""]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </td>
        <td className="px-3 py-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => onSaveEmail(email.trim())}
            placeholder="add email manually"
            className={`w-56 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm hover:border-line focus:border-accent focus:outline-none ${
              email ? "text-ok" : "text-muted"
            }`}
          />
        </td>
        <td className={`px-3 py-3 text-xs ${statusColor}`}>{lead.status}</td>
        <td className="px-3 py-3 text-right">
          {lead.draft && (
            <button onClick={onOpen} className="text-xs text-accent hover:underline">
              {open ? "Hide draft" : "View draft"}
            </button>
          )}
        </td>
      </tr>
      {open && lead.draft && (
        <tr className="bg-panel">
          <td></td>
          <td colSpan={4} className="px-3 pb-5">
            {lead.draft.angle && <p className="mb-2 text-xs text-muted">Why they fit: {lead.draft.angle}</p>}
            <div className="rounded-lg border border-line bg-[#0a0a13] p-4">
              <div className="mb-3 text-sm font-medium">Subject: {lead.draft.subject}</div>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-text/90">{lead.draft.body}</pre>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="ghost" onClick={copy}>
                {copied ? "Copied" : "Copy"}
              </Button>
              {lead.email ? (
                <a
                  href={mailto(lead)}
                  className="rounded-lg border border-line bg-panel-2 px-4 py-2 text-sm hover:border-accent/60"
                >
                  Open in mail app
                </a>
              ) : (
                <span className="self-center text-xs text-warn">Add an email (or send as a DM) before sending.</span>
              )}
              <Button variant="ghost" onClick={onSent} disabled={lead.status === "sent"}>
                Mark as sent
              </Button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
