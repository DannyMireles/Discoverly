"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StripeSettingsPanel() {
  const [message, setMessage] = useState("No connected Stripe account is configured in this local MVP scaffold.");

  return (
    <div className="space-y-6">
      <Banner title="Stripe Connect is required for payouts.">
        Affiliates can share codes before connecting Stripe, but payouts remain paused until Stripe payouts are enabled.
      </Banner>
      <Card>
        <CardHeader><CardTitle>Company Stripe Account</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm leading-6 text-slate-600">{message}</p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => setMessage("Stripe setup route exists, but needs live credentials and account persistence before redirecting.")}>
              Start Stripe Setup
              <ExternalLink className="h-4 w-4" aria-hidden />
            </Button>
            <Button type="button" variant="secondary" onClick={() => setMessage("Webhook route is mounted at /api/stripe/webhook and verifies Stripe signatures.")}>
              Check Webhook Route
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
