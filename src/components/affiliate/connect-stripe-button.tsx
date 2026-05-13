"use client";

import { useState } from "react";
import { ArrowRight, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConnectStripeButton({
  affiliateId,
  email,
  className,
  variant = "primary",
  returnPath = "/affiliate/dashboard",
}: {
  affiliateId: string;
  email: string;
  className?: string;
  variant?: "primary" | "secondary";
  returnPath?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const callback = new URL("/api/stripe/connect/affiliate/callback", origin);
      callback.searchParams.set("affiliateId", affiliateId);
      callback.searchParams.set("returnPath", returnPath);
      const response = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          affiliateId,
          email,
          returnUrl: callback.toString(),
          refreshUrl: `${origin}${returnPath}?stripe=refresh`,
        }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error ?? "Could not start Stripe Connect.");
      window.location.href = payload.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Stripe Connect.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" variant={variant} className={className} onClick={() => void go()} disabled={loading}>
        <CreditCard className="h-4 w-4" aria-hidden />
        {loading ? "Opening Stripe…" : "Connect Stripe"}
        {!loading ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
      </Button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
