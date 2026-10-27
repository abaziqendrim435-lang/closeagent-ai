"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, Input, Notice, Textarea, api } from "@/components/ui";

interface Profile {
  sender_name: string;
  sender_company: string;
  offer: string;
  cta: string;
  language: string;
  subscription_status: string;
  current_period_end: string | null;
}

const LANGS = ["English", "German", "Turkish", "Albanian", "Spanish", "French", "Italian"];

export default function SettingsPage() {
  const [p, setP] = useState<Profile | null>(null);
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  useEffect(() => {
    api<{ profile: Profile; plan: "free" | "pro" }>("/api/settings")
      .then((d) => {
        setP(d.profile);
        setPlan(d.plan);
      })
      .catch((e) => setMsg({ tone: "bad", text: e.message }));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!p) return;
    setSaving(true);
    try {
      await api("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          sender_name: p.sender_name ?? "",
          sender_company: p.sender_company ?? "",
          offer: p.offer ?? "",
          cta: p.cta ?? "",
          language: p.language || "English",
        }),
      });
      setMsg({ tone: "ok", text: "Saved." });
    } catch (err) {
      setMsg({ tone: "bad", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function billing(path: "checkout" | "portal") {
    try {
      const { url } = await api<{ url: string }>(`/api/billing/${path}`, { method: "POST" });
      window.location.href = url;
    } catch (err) {
      setMsg({ tone: "bad", text: (err as Error).message });
    }
  }

  if (!p) return <p className="text-sm text-muted">Loading…</p>;
  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setP({ ...p, [k]: e.target.value });

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Offer & billing</h1>
        <p className="mt-1 text-sm text-muted">Every draft is written from this offer.</p>
      </header>

      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      <Card>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name">
              <Input value={p.sender_name ?? ""} onChange={set("sender_name")} placeholder="Qendrim" />
            </Field>
            <Field label="Company / brand">
              <Input value={p.sender_company ?? ""} onChange={set("sender_company")} placeholder="CloseAgent.ai" />
            </Field>
          </div>
          <Field label="What do you offer?" hint="Be concrete: what it is, who it's for, what they get.">
            <Textarea
              value={p.offer ?? ""}
              onChange={set("offer")}
              className="min-h-32"
              placeholder="Affiliate partnership: 30% recurring commission on every subscriber you refer, plus free access to test it…"
            />
          </Field>
          <Field label="Call to action">
            <Input value={p.cta ?? ""} onChange={set("cta")} placeholder={`Reply "yes" and I'll send you free access and your link`} />
          </Field>
          <Field label="Email language">
            <select
              value={p.language || "English"}
              onChange={set("language")}
              className="w-full rounded-lg border border-line bg-[#0a0a13] px-3 py-2 text-sm"
            >
              {LANGS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Field>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save offer"}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">Plan</h2>
        {plan === "pro" ? (
          <>
            <p className="mb-4 text-sm text-muted">
              Pro — {p.subscription_status}
              {p.current_period_end ? `, renews ${new Date(p.current_period_end).toLocaleDateString()}` : ""}
            </p>
            <Button variant="ghost" onClick={() => billing("portal")}>
              Manage subscription
            </Button>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">
              Free trial. Pro gives you 100 searches, 600 AI drafts and 150 company lookups every month for $39.99/month.
              Cancel anytime.
            </p>
            <Button onClick={() => billing("checkout")}>Upgrade to Pro</Button>
          </>
        )}
      </Card>
    </div>
  );
}
