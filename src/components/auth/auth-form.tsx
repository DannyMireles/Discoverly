"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  initialName,
}: {
  inviteToken?: string;
  redirectTo?: string;
  lockedEmail?: string;
  initialName?: string;
}) {
  const isInviteFlow = Boolean(inviteToken);
  const mode: OtpAuthMode = isInviteFlow ? "affiliate-sign-up" : "sign-in";
  const [email, setEmail] = useState(lockedEmail ?? "");
  const [name, setName] = useState(initialName ?? "");
  const token = inviteToken ?? "";
  const emailLocked = Boolean(lockedEmail);
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
          {mode === "affiliate-sign-up" && "Accept affiliate invite"}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-[#525a48]">
          {mode === "sign-in" && "We’ll email you a short code. No password and no links—just type the digits."}
          {mode === "affiliate-sign-up" &&
            "Confirm your name and email. We’ll send a code to verify it’s you, then activate your affiliate account."}
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
            />
            {initialName && (
              <p className="mt-1 text-xs text-[#525a48]">Pre-filled from your invite. Update it if needed.</p>
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

        {message && <p className="text-sm text-red-600">{message}</p>}

        <Button type="button" className="w-full" onClick={sendCode} disabled={loading}>
          {loading ? "Sending…" : isInviteFlow ? "Send my sign-in code" : "Email me a code"}
        </Button>
      </CardContent>
    </Card>
  );
}
