import { CheckCircle2, ExternalLink } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CurrentCompany } from "@/lib/company/current";

export function StripeSettingsPanel({ company }: { company: CurrentCompany }) {
  const connectUrl = `/api/stripe/connect/company?companyId=${company.id}`;

  return (
    <div className="space-y-6">
      <Banner title="Stripe Connect is required for payouts." tone="info">
        Affiliates can share codes before Stripe is connected, but all payouts are paused until you link your account.
      </Banner>

      <Card>
        <CardHeader>
          <CardTitle>Company Stripe Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {company.stripe_connected ? (
            <div className="flex items-center gap-3 rounded-xl border border-[#c8dbb8] bg-[#e8f2de]/90 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#3f8147]" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-[#2a5c30]">Stripe account connected</p>
                <p className="text-xs text-[#4a7a50]">Payouts will transfer from your Stripe balance to each affiliate.</p>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-6 text-[#3e4240]">
              Connect your Stripe account so Discoverly can send affiliate payouts directly from your Stripe balance.
              You&apos;ll be taken to Stripe to authorise access — no card details are shared with Discoverly.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <a
              href={connectUrl}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#635bff] px-6 text-sm font-bold text-white shadow-[0_14px_34px_rgba(99,91,255,0.28)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#5851eb] hover:shadow-[0_20px_44px_rgba(99,91,255,0.38)]"
            >
              {company.stripe_connected ? "Reconnect Stripe" : "Connect Stripe"}
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>

            {company.stripe_connected && (
              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/60 bg-white/75 px-6 text-sm font-bold text-[#1f2024] shadow-[0_10px_28px_rgba(22,21,36,0.08)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white"
              >
                Open Stripe Dashboard
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            )}
          </div>

          <div className="rounded-xl border border-white/60 bg-white/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#525a48]">How it works</p>
            <ol className="mt-2 space-y-1 text-xs leading-5 text-[#3e4240]">
              <li>1. Click Connect Stripe and log in to your Stripe account.</li>
              <li>2. Authorise Discoverly to send transfers on your behalf.</li>
              <li>3. When you approve a payout batch, funds move from your Stripe balance to each affiliate&apos;s account.</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
