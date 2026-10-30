"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, Card, Field, Input, Notice } from "@/components/ui";
import { authClient } from "@/lib/auth/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  // Landing-page CTAs link to /login?mode=signup.
  const initialMode = useSearchParams().get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const result =
      mode === "signin"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name: name || email.split("@")[0] });
    setBusy(false);
    if (result.error) {
      setError(result.error.message || "Something went wrong. Try again.");
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Link href="/" className="mb-8 text-center text-lg font-semibold">
        Close<span className="gradient-text">Agent</span>
      </Link>
      <Card>
        <div className="mb-5 flex rounded-lg border border-line p-1 text-sm">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-md py-1.5 ${mode === m ? "bg-panel-2 text-text" : "text-muted"}`}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </Field>
          )}
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </Field>
          <Field label="Password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
            <Input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </Field>
          {error && <Notice tone="bad">{error}</Notice>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create free account"}
          </Button>
          {mode === "signup" && (
            <p className="text-center text-xs text-muted">
              By creating an account you agree to the{" "}
              <Link href="/terms" className="text-accent hover:underline">Terms</Link> and{" "}
              <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>.
            </p>
          )}
        </form>
      </Card>
    </main>
  );
}
