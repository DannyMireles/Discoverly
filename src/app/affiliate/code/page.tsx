import { AppShell } from "@/components/layout/app-shell";
import { AffiliateStripeConnectBanner } from "@/components/affiliate/stripe-connect-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyField } from "@/components/ui/copy-field";
import { Banner } from "@/components/ui/banner";
import { getAffiliateData } from "@/lib/company/data";
import { stripTrailingZeros } from "@/lib/utils/format";

export default async function AffiliateCodePage() {
  const data = await getAffiliateData();

  return (
    <AppShell title="Affiliate Code" description="Your code and program details." section="affiliate">
      <div className="space-y-6">
        {data.affiliate && !data.affiliate.stripe_connected ? (
          <AffiliateStripeConnectBanner
            affiliateId={data.affiliate.id}
            email={data.affiliate.email}
            returnPath="/affiliate/code"
          />
        ) : null}
        {!data.promotion ? (
          <Banner title="No code yet" tone="warning">Accept your invite to see your affiliate code.</Banner>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            <Card>
              <CardHeader><CardTitle>Code</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <CopyField label="Public code" value={data.promotion.public_code} />
                <CopyField label="Booking page" value={data.company?.booking_site_url ?? "Not configured"} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Program Details</CardTitle></CardHeader>
              <CardContent className="grid gap-3">
                <Detail label="Company" value={data.company?.name ?? "Not configured"} />
                <Detail label="Guest discount" value={formatMoneyOrPercent(data.promotion.guest_discount_type, data.promotion.guest_discount_value)} />
                <Detail label="Payout" value={formatMoneyOrPercent(data.promotion.affiliate_payout_type, data.promotion.affiliate_payout_value)} />
                <Detail label="Commission base" value={formatPayoutBase(data.promotion.affiliate_payout_base)} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function formatMoneyOrPercent(type: unknown, value: unknown) {
  const numericValue = Number(value ?? 0);
  return type === "fixed" ? `$${stripTrailingZeros(numericValue)}` : `${stripTrailingZeros(numericValue)}%`;
}

function formatPayoutBase(value: unknown) {
  if (value === "booking_total") return "Booking total";
  if (value === "total_minus_taxes_fees") return "Total minus taxes and fees";
  return "Stay subtotal";
}
