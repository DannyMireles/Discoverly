"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "sign-in" | "company-sign-up" | "affiliate-sign-up";

export function AuthForm({
  inviteToken,
  redirectTo,
}: {
  inviteToken?: string;
  redirectTo?: string;
}) {
  const [mode, setMode] = useState<Mode>(inviteToken ? "affiliate-sign-up" : "sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [token, setToken] = useState(inviteToken ?? "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit() {
    setLoading(true);
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(redirectTo ?? "/company/dashboard");
        router.refresh();
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (signUpError) throw signUpError;

      if (mode === "affiliate-sign-up") {
        if (!token) {
          setMessage("Paste your invite token to activate your affiliate account.");
          setLoading(false);
          return;
        }
        const response = await fetch("/api/invites/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteToken: token }),
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Could not accept invite.");
        router.push("/affiliate/dashboard");
        router.refresh();
        return;
      }

      // Company admin — go to onboarding
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
        <CardTitle>
          {mode === "sign-in" && "Sign In"}
          {mode === "company-sign-up" && "Create Company Admin Account"}
          {mode === "affiliate-sign-up" && "Accept Your Affiliate Invite"}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {!inviteToken && (
          <div className="flex gap-1.5 rounded-full border border-white/60 bg-white/50 p-1">
            {(
              [
                { id: "sign-in", label: "Sign In", icon: null },
                { id: "company-sign-up", label: "Company", icon: Building2 },
                { id: "affiliate-sign-up", label: "Affiliate", icon: Users },
              ] as { id: Mode; label: string; icon: React.ElementType | null }[]
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-bold transition-all duration-200 ${
                  mode === id
                    ? "bg-white text-[#0d0c21] shadow-[0_8px_20px_rgba(22,21,36,0.12)]"
                    : "text-[#3e4240] hover:bg-white/70"
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
                {label}
              </button>
            ))}
          </div>
        )}

        {mode === "company-sign-up" && (
          <p className="text-sm leading-6 text-[#525a48]">
            Create your admin account, then complete company onboarding to connect Lodgify and Stripe.
            You&apos;ll need a company invite token on the next step.
          </p>
        )}
        {mode === "affiliate-sign-up" && (
          <p className="text-sm leading-6 text-[#525a48]">
            Create your account using the invite token from your invitation link. This links you to the
            property you were invited to represent.
          </p>
        )}

        {mode !== "sign-in" && (
          <div>
            <label className="text-sm font-medium text-[#1f221c]">Your name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              autoComplete="name"
            />
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-[#1f221c]">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[#1f221c]">Password</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          />
        </div>

        {mode === "affiliate-sign-up" && (
          <div>
            <label className="text-sm font-medium text-[#1f221c]">Invite token</label>
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your invite token"
              autoComplete="off"
              readOnly={Boolean(inviteToken)}
              className={inviteToken ? "opacity-70" : ""}
            />
            {inviteToken && (
              <p className="mt-1 text-xs text-[#525a48]">Pre-filled from your invite link.</p>
            )}
          </div>
        )}

        {message && <p className="text-sm text-red-600">{message}</p>}

        <Button type="button" className="w-full" onClick={submit} disabled={loading}>
          {loading
            ? "Working..."
            : mode === "sign-in"
              ? "Sign In"
              : mode === "affiliate-sign-up"
                ? "Create Account & Accept Invite"
                : "Create Account"}
        </Button>

        {mode !== "sign-in" && (
          <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("sign-in")}>
            I already have an account — Sign in
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
