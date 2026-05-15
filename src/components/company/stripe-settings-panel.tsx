import Link from "next/link";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CurrentCompany } from "@/lib/company/current";

export function StripeSettingsPanel({ company }: { company: CurrentCompany }) {
  return (
    <div className="space-y-6">
      <Banner title="Stripe handles payout funding and affiliate transfers." tone="info">
        Companies fund payout batches through Stripe Checkout. Affiliates connect Stripe once so Discoverly can send
        their approved payouts automatically after the batch payment succeeds.
      </Banner>

      <Card>
        <CardHeader>
          <CardTitle>Payout Funding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl border border-[#c8dbb8] bg-[#e8f2de]/90 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-[#3f8147]" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-[#2a5c30]">Company Stripe connection is not required</p>
              <p className="text-xs text-[#4a7a50]">Fund each approved {company.name} payout batch directly from the Payouts page.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/company/payouts"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#635bff] px-6 text-sm font-bold text-white shadow-[0_14px_34px_rgba(99,91,255,0.28)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#5851eb] hover:shadow-[0_20px_44px_rgba(99,91,255,0.38)]"
            >
              Open Payouts
              <ExternalLink className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <div className="rounded-xl border border-white/60 bg-white/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#525a48]">How it works</p>
            <ol className="mt-2 space-y-1 text-xs leading-5 text-[#3e4240]">
              <li>1. Prepare the current payout batch from eligible commissions.</li>
              <li>2. Pay the batch total in Stripe Checkout.</li>
              <li>3. After Stripe confirms payment, Discoverly transfers each amount to the connected affiliate.</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
