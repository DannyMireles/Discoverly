import { addDays, endOfMonth, startOfMonth, subMonths } from "date-fns";
import type { CommissionStatus } from "@/lib/constants";

export type EligibleCommission = {
  id: string;
  affiliate_id: string;
  commission_amount: number;
  status: CommissionStatus;
};

export type AffiliatePayoutGroup = {
  affiliateId: string;
  commissionIds: string[];
  eligibleBookings: number;
  amount: number;
};

export function getPreviousMonthPayoutWindow(now = new Date()) {
  const previousMonth = subMonths(now, 1);
  const periodStart = startOfMonth(previousMonth);
  const periodEnd = endOfMonth(previousMonth);
  const payBy = addDays(endOfMonth(previousMonth), 3);

  return { periodStart, periodEnd, payBy };
}

export function groupEligibleCommissions(commissions: EligibleCommission[]) {
  const groups = new Map<string, AffiliatePayoutGroup>();

  for (const commission of commissions) {
    if (commission.status !== "eligible") continue;

    const existing = groups.get(commission.affiliate_id) ?? {
      affiliateId: commission.affiliate_id,
      commissionIds: [],
      eligibleBookings: 0,
      amount: 0,
    };

    existing.commissionIds.push(commission.id);
    existing.eligibleBookings += 1;
    existing.amount = roundCurrency(existing.amount + commission.commission_amount);
    groups.set(commission.affiliate_id, existing);
  }

  return Array.from(groups.values());
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
