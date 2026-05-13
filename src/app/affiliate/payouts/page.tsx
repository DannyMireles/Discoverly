import { BadgeDollarSign, CheckCircle2, Clock } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AffiliateStripeConnectBanner } from "@/components/affiliate/stripe-connect-banner";
import { getAffiliateData } from "@/lib/company/data";
import { formatCurrency, formatDate, formatOrdinalDay } from "@/lib/utils/format";

export default async function AffiliatePayoutsPage() {
  const data = await getAffiliateData();
  const pending = data.commissions.filter((commission) => commission.status !== "paid").reduce((sum, commission) => sum + Number(commission.commission_amount ?? 0), 0);
  const paid = data.commissions.filter((commission) => commission.status === "paid").reduce((sum, commission) => sum + Number(commission.commission_amount ?? 0), 0);

  return (
    <AppShell title="Affiliate Payouts" description="Pending, eligible, and paid earnings." section="affiliate">
      <div className="space-y-6">
        {data.affiliate && !data.affiliate.stripe_connected ? (
          <AffiliateStripeConnectBanner
            affiliateId={data.affiliate.id}
            email={data.affiliate.email}
            returnPath="/affiliate/payouts"
          />
        ) : null}
        <section className="grid gap-5 md:grid-cols-4">
          <StatCard label="Pending" value={formatCurrency(pending)} icon={<Clock className="h-5 w-5" />} tone="amber" />
          <StatCard label="Eligible" value={formatCurrency(data.commissions.filter((commission) => commission.status === "eligible").reduce((sum, commission) => sum + Number(commission.commission_amount ?? 0), 0))} icon={<BadgeDollarSign className="h-5 w-5" />} />
          <StatCard label="Paid" value={formatCurrency(paid)} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
          <StatCard
            label="Next Payout Date"
            value={formatOrdinalDay(data.company?.payout_pay_by_day ?? null, "—")}
            detail="Monthly review"
            tone="slate"
          />
        </section>
        <Card>
          <CardHeader><CardTitle>Commission History</CardTitle></CardHeader>
          <CardContent className="p-0">
            {data.commissions.length === 0 ? (
              <div className="p-8 text-sm text-slate-500">No commissions yet.</div>
            ) : (
              <Table>
                <THead><TR><TH>Date</TH><TH>Commission</TH><TH>Status</TH><TH>Paid Date</TH></TR></THead>
                <TBody>
                  {data.commissions.map((commission) => (
                    <TR key={commission.id}>
                      <TD>{formatDate(commission.created_at)}</TD>
                      <TD>{formatCurrency(Number(commission.commission_amount ?? 0))}</TD>
                      <TD><StatusBadge status={commission.status} /></TD>
                      <TD>{formatDate(commission.paid_at, "Not paid")}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
