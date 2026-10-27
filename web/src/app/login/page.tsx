"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card, Field, Input, Notice } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setState("error");
    } else setState("sent");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Link href="/" className="mb-8 text-center text-lg font-semibold">
        Close<span className="gradient-text">Agent</span>
      </Link>
      <Card>
        <h1 className="mb-1 text-xl font-semibold">Sign in</h1>
        <p className="mb-5 text-sm text-muted">We&apos;ll email you a magic link. No password needed.</p>
        {state === "sent" ? (
          <Notice tone="ok">Check your inbox for {email} and click the link to continue.</Notice>
        ) : (
          <form onSubmit={sendLink} className="space-y-4">
            <Field label="Email">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </Field>
            {state === "error" && <Notice tone="bad">{error}</Notice>}
            <Button type="submit" className="w-full" disabled={state === "sending"}>
              {state === "sending" ? "Sending…" : "Send magic link"}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
