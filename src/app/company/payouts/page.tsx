import { AppShell } from "@/components/layout/app-shell";
import { PayoutsView } from "@/components/company/payouts-view";
import { getCompanyData } from "@/lib/company/data";
import { formatOrdinalDay } from "@/lib/utils/format";

export default async function PayoutsPage() {
  const data = await getCompanyData();
  const payByDay = data.company?.payout_pay_by_day;
  const latestBatch = data.payoutBatches[0] ?? null;
  const latestPayoutByAffiliateId = new Map<string, (typeof data.payouts)[number]>();
  for (const payout of data.payouts) {
    const affiliateId = payout.affiliate_id as string;
    if (!latestPayoutByAffiliateId.has(affiliateId)) {
      latestPayoutByAffiliateId.set(affiliateId, payout);
    }
  }

  const groups = data.affiliates.map((affiliate) => {
    const commissions = data.commissions.filter((commission) => commission.affiliate_id === affiliate.id);
    const payout = latestPayoutByAffiliateId.get(affiliate.id as string) ?? null;
    const calculatedAmount = commissions
      .filter((commission) => ["pending", "eligible", "approved", "held"].includes(commission.status))
      .reduce((sum, commission) => sum + Number(commission.commission_amount ?? 0), 0);
    return {
      affiliate: affiliate.name as string,
      stripeStatus: affiliate.stripe_connected ? "Connected" : "Needs Stripe",
      eligibleBookings: commissions.filter((commission) => commission.status === "eligible").length,
      revenueDriven: 0,
      commissionAmount: payout ? Number(payout.amount ?? 0) : calculatedAmount,
      status: (payout?.status as string | undefined) ?? (commissions.some((commission) => commission.status === "approved") ? "approved" : "pending"),
      payoutId: (payout?.id as string | undefined) ?? null,
      payoutBatchId: (payout?.payout_batch_id as string | undefined) ?? null,
    };
  });

  return (
    <AppShell
      title="Payouts"
      description={`Review and fund the previous month's payouts by the ${formatOrdinalDay(payByDay, "set")}.`}
    >
      {data.company ? (
        <PayoutsView
          companyId={data.company.id}
          currencyCode={data.company.currency_code}
          currentBatch={
            latestBatch
              ? {
                  id: latestBatch.id as string,
                  status: latestBatch.status as string,
                  totalAmount: Number(latestBatch.total_amount ?? 0),
                  fundingStatus: (latestBatch.funding_status as string | undefined) ?? "not_started",
                  fundingError: (latestBatch.funding_error as string | null | undefined) ?? null,
                }
              : null
          }
          groups={groups}
        />
      ) : (
        <PayoutsView companyId="" currencyCode="USD" currentBatch={null} groups={[]} />
      )}
    </AppShell>
  );
}
