"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { writeOtpFlowPayload } from "@/lib/auth/otp-flow-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function describeAuthFailure(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = String((error as { message: string }).message);
    const status = (error as { status?: number }).status;
    if (status === 500) {
      return `${msg} Email delivery is temporarily unavailable. Please try again or contact support.`;
    }
    return msg;
  }
  return "Could not send the code. Try again.";
}

export function PublicAffiliateJoinForm({
  companySlug,
}: {
  companySlug: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    setLoading(true);
    setMessage("");
    try {
      const trimmedName = name.trim();
      const trimmedEmail = email.trim().toLowerCase();

      if (!trimmedName) {
        setMessage("Enter your name.");
        return;
      }
      if (!trimmedEmail) {
        setMessage("Enter your email address.");
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          shouldCreateUser: true,
          data: {
            full_name: trimmedName,
          },
        },
      });

      if (error) throw error;

      writeOtpFlowPayload({
        email: trimmedEmail,
        mode: "public-affiliate-sign-up",
        fullName: trimmedName,
        inviteToken: "",
        companySlug,
        redirectTo: null,
      });

      router.push("/auth/verify");
    } catch (error) {
      setMessage(describeAuthFailure(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="public-affiliate-name" className="text-sm font-medium text-[#1f221c]">
          Your name
        </label>
        <Input
          id="public-affiliate-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Jane Smith"
          autoComplete="name"
        />
      </div>
      <div>
        <label htmlFor="public-affiliate-email" className="text-sm font-medium text-[#1f221c]">
          Email
        </label>
        <Input
          id="public-affiliate-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>
      {message ? <p className="text-sm text-red-600">{message}</p> : null}
      <Button type="button" className="w-full" onClick={sendCode} disabled={loading}>
        {loading ? "Sending..." : "Send verification code"}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
