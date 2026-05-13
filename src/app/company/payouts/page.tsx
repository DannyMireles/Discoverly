import { AppShell } from "@/components/layout/app-shell";
import { PayoutsView } from "@/components/company/payouts-view";
import { getCompanyData } from "@/lib/company/data";
import { formatOrdinalDay } from "@/lib/utils/format";

export default async function PayoutsPage() {
  const data = await getCompanyData();
  const payByDay = data.company?.payout_pay_by_day;
  const groups = data.affiliates.map((affiliate) => {
    const commissions = data.commissions.filter((commission) => commission.affiliate_id === affiliate.id);
    return {
      affiliate: affiliate.name as string,
      stripeStatus: affiliate.stripe_connected ? "Connected" : "Needs Stripe",
      eligibleBookings: commissions.filter((commission) => commission.status === "eligible").length,
      revenueDriven: 0,
      commissionAmount: commissions
        .filter((commission) => ["pending", "eligible", "approved", "held"].includes(commission.status))
        .reduce((sum, commission) => sum + Number(commission.commission_amount ?? 0), 0),
      status: commissions.some((commission) => commission.status === "approved") ? "approved" : "pending",
    };
  });

  return (
    <AppShell
      title="Payouts"
      description={`Previous month is paid by the ${formatOrdinalDay(payByDay, "set")} after manual approval.`}
    >
      <PayoutsView groups={groups} />
    </AppShell>
  );
}
