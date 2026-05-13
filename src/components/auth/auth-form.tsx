"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { writeOtpFlowPayload, type OtpAuthMode } from "@/lib/auth/otp-flow-storage";

function describeAuthFailure(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = String((error as { message: string }).message);
    const status = (error as { status?: number }).status;
    if (status === 500) {
      return `${msg} If you enabled custom SMTP in Supabase, email sending failed—check SMTP settings and Authentication logs, or disable custom SMTP to confirm.`;
    }
    return msg;
  }
  return "Could not send the code. Try again.";
}

export function AuthForm({
  inviteToken,
  redirectTo,
  lockedEmail,
  lockedName,
}: {
  inviteToken?: string;
  redirectTo?: string;
  lockedEmail?: string;
  lockedName?: string;
}) {
  const isInviteFlow = Boolean(inviteToken);
  const [mode, setMode] = useState<OtpAuthMode>(isInviteFlow ? "affiliate-sign-up" : "sign-in");
  const [email, setEmail] = useState(lockedEmail ?? "");
  const [name, setName] = useState(lockedName ?? "");
  const [token, setToken] = useState(inviteToken ?? "");
  const emailLocked = Boolean(lockedEmail);
  const nameLocked = Boolean(lockedName);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function sendCode() {
    setLoading(true);
    setMessage("");
    try {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) {
        setMessage("Enter your email address.");
        return;
      }

      if (mode !== "sign-in" && !name.trim()) {
        setMessage("Enter your name.");
        return;
      }

      if (mode === "affiliate-sign-up" && !token.trim()) {
        setMessage("Paste your invite token from your invitation.");
        return;
      }

      const supabase = createSupabaseBrowserClient();

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          shouldCreateUser: mode !== "sign-in",
          data:
            mode === "sign-in"
              ? {}
              : {
                  full_name: name.trim(),
                },
        },
      });

      if (error) throw error;

      writeOtpFlowPayload({
        email: trimmedEmail,
        mode,
        fullName: mode === "sign-in" ? "" : name.trim(),
        inviteToken: token.trim(),
        redirectTo: redirectTo ?? null,
      });

      router.push("/auth/verify");
    } catch (error) {
      setMessage(describeAuthFailure(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>
          {mode === "sign-in" && "Sign in"}
          {mode === "company-sign-up" && "Create company admin"}
          {mode === "affiliate-sign-up" && "Accept affiliate invite"}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isInviteFlow && (
          <div className="flex gap-1.5 rounded-full border border-white/60 bg-white/50 p-1">
            {(
              [
                { id: "sign-in" as const, label: "Sign in", icon: null },
                { id: "company-sign-up" as const, label: "Company", icon: Building2 },
                { id: "affiliate-sign-up" as const, label: "Affiliate", icon: Users },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setMode(id);
                  setMessage("");
                }}
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

        <p className="text-sm leading-6 text-[#525a48]">
          {mode === "sign-in" && "We’ll email you a short code. No password and no links—just type the digits."}
          {mode === "company-sign-up" &&
            "Create your admin account with a one-time code, then finish onboarding (Lodgify, Stripe, invite token) on the next screens."}
          {mode === "affiliate-sign-up" &&
            "Use the invite token from your host. We’ll send a code to your email to confirm it’s you."}
        </p>

        {mode !== "sign-in" && (
          <div>
            <label htmlFor="auth-name" className="text-sm font-medium text-[#1f221c]">
              Your name
            </label>
            <Input
              id="auth-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              autoComplete="name"
              readOnly={nameLocked}
              className={nameLocked ? "opacity-70" : ""}
            />
            {nameLocked && (
              <p className="mt-1 text-xs text-[#525a48]">Pre-filled from your invite.</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="auth-email" className="text-sm font-medium text-[#1f221c]">
            Email
          </label>
          <Input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            readOnly={emailLocked}
            className={emailLocked ? "opacity-70" : ""}
          />
          {emailLocked && (
            <p className="mt-1 text-xs text-[#525a48]">
              This invite is bound to this email. Reach out to your host if you need a different one.
            </p>
          )}
        </div>

        {mode === "affiliate-sign-up" && !isInviteFlow && (
          <div>
            <label htmlFor="auth-invite" className="text-sm font-medium text-[#1f221c]">
              Invite token
            </label>
            <Input
              id="auth-invite"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your invite token"
              autoComplete="off"
            />
          </div>
        )}

        {message && <p className="text-sm text-red-600">{message}</p>}

        <Button type="button" className="w-full" onClick={sendCode} disabled={loading}>
          {loading ? "Sending…" : isInviteFlow ? "Send my sign-in code" : "Email me a code"}
        </Button>

        {mode !== "sign-in" && !isInviteFlow && (
          <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("sign-in")}>
            I already have an account — Sign in
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
