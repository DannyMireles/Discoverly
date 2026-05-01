"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  clearOtpFlowPayload,
  readOtpFlowPayload,
  writeOtpFlowPayload,
  type OtpFlowPayload,
} from "@/lib/auth/otp-flow-storage";

const CODE_LENGTH = 8;

function normalizeOtp(raw: string) {
  return raw.replace(/\D/g, "").slice(0, CODE_LENGTH);
}

async function sendOtpForPayload(payload: OtpFlowPayload) {
  const supabase = createSupabaseBrowserClient();
  return supabase.auth.signInWithOtp({
    email: payload.email,
    options: {
      shouldCreateUser: payload.mode !== "sign-in",
      data:
        payload.mode === "sign-in"
          ? {}
          : {
              full_name: payload.fullName,
            },
    },
  });
}

export function VerifyOtpForm() {
  const router = useRouter();
  const [payload, setPayload] = useState<OtpFlowPayload | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    const data = readOtpFlowPayload();
    if (!data) {
      router.replace("/auth");
      return;
    }
    setPayload(data);
    setInfo(`We sent a code to ${data.email}. It may take a minute to arrive.`);
  }, [router]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const t = window.setInterval(() => setResendSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [resendSeconds]);

  async function verify() {
    if (!payload) return;
    const token = normalizeOtp(code);
    if (token.length < 6) {
      setMessage("Enter the full code from your email (at least 6 digits).");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.verifyOtp({
        email: payload.email,
        token,
        type: "email",
      });
      if (error) throw error;

      if (payload.mode === "affiliate-sign-up") {
        if (!payload.inviteToken.trim()) {
          throw new Error("Invite token is missing. Go back and paste the token from your invitation.");
        }
        const response = await fetch("/api/invites/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteToken: payload.inviteToken.trim() }),
        });
        const body = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Could not link your invite.");
      }

      clearOtpFlowPayload();

      if (payload.mode === "company-sign-up") {
        router.push("/company/onboarding");
      } else if (payload.mode === "affiliate-sign-up") {
        router.push("/affiliate/dashboard");
      } else {
        router.push(payload.redirectTo?.trim() ? payload.redirectTo : "/company/dashboard");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That code didn’t work. Try again or request a new one.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!payload || resendSeconds > 0 || loading) return;
    setLoading(true);
    setMessage("");
    try {
      const { error } = await sendOtpForPayload(payload);
      if (error) throw error;
      writeOtpFlowPayload(payload);
      setInfo(`A fresh code is on its way to ${payload.email}.`);
      setResendSeconds(45);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not resend. Try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  function startOver() {
    clearOtpFlowPayload();
    router.push("/auth");
  }

  if (!payload) {
    return (
      <Card className="w-full max-w-lg">
        <CardContent className="py-10 text-center text-sm text-[#525a48]">Loading…</CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Enter your code</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {info && <p className="text-sm leading-6 text-[#525a48]">{info}</p>}

        <div>
          <label htmlFor="otp-code" className="text-sm font-medium text-[#1f221c]">
            Verification code
          </label>
          <PasswordInput
            id="otp-code"
            value={code}
            onChange={(e) => setCode(normalizeOtp(e.target.value))}
            placeholder="••••••"
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={CODE_LENGTH}
            spellCheck={false}
            className="font-mono tracking-[0.35em]"
            aria-describedby="otp-hint"
          />
          <p id="otp-hint" className="mt-1 text-xs text-[#525a48]">
            Use the eye icon if you want to see the digits while you type.
          </p>
        </div>

        {message && <p className="text-sm text-red-600">{message}</p>}

        <Button type="button" className="w-full" onClick={verify} disabled={loading}>
          {loading ? "Checking…" : "Continue"}
        </Button>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="w-full sm:w-auto"
            disabled={loading || resendSeconds > 0}
            onClick={() => void resend()}
          >
            {resendSeconds > 0 ? `Resend code (${resendSeconds}s)` : "Resend code"}
          </Button>
          <button
            type="button"
            onClick={startOver}
            className="text-center text-sm font-medium text-[#525a48] underline-offset-4 hover:text-[#171912] hover:underline"
          >
            Wrong email? Start over
          </button>
        </div>

        <p className="text-center text-xs text-[#6a6f62]">
          Trouble receiving email? Check spam, then{" "}
          <Link href="/auth" className="underline-offset-2 hover:underline">
            return to sign in
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
