"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const result =
        mode === "sign-up"
          ? await supabase.auth.signUp({
              email,
              password,
              options: { data: { full_name: name } },
            })
          : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) throw result.error;
      router.push("/company/onboarding");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{mode === "sign-up" ? "Create Your Admin Account" : "Sign In"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === "sign-up" ? (
          <div>
            <label className="text-sm font-medium text-slate-700">Your name</label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Daniel" />
          </div>
        ) : null}
        <div>
          <label className="text-sm font-medium text-slate-700">Email</label>
          <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Password</label>
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        {message ? <p className="text-sm text-red-600">{message}</p> : null}
        <Button type="button" className="w-full" onClick={submit} disabled={loading}>
          {loading ? "Working..." : mode === "sign-up" ? "Create Account" : "Sign In"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => setMode(mode === "sign-up" ? "sign-in" : "sign-up")}
        >
          {mode === "sign-up" ? "I already have an account" : "Create an account"}
        </Button>
      </CardContent>
    </Card>
  );
}
