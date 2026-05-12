import type { CompanyDataState } from "@/lib/company/data";

export type PeriodKey = "7d" | "14d" | "30d" | "90d" | "180d" | "365d" | "all";

export const PERIOD_OPTIONS: Array<{ value: PeriodKey; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "14d", label: "Last 14 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 3 months" },
  { value: "180d", label: "Last 6 months" },
  { value: "365d", label: "Last 12 months" },
  { value: "all", label: "All time" },
];

export const DEFAULT_PERIOD: PeriodKey = "180d";

export function parsePeriod(value: string | null | undefined): PeriodKey {
  const match = PERIOD_OPTIONS.find((p) => p.value === value);
  return match?.value ?? DEFAULT_PERIOD;
}

export function periodSince(period: PeriodKey): Date | null {
  if (period === "all") return null;
  const days = Number(period.replace("d", ""));
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function periodMonths(period: PeriodKey): number {
  switch (period) {
    case "7d":
    case "14d":
    case "30d":
      return 1;
    case "90d":
      return 3;
    case "180d":
      return 6;
    case "365d":
      return 12;
    case "all":
      return 12;
  }
}

export type FilteredCompanyData = CompanyDataState;

export function applyDashboardFilters(
  data: CompanyDataState,
  options: { since: Date | null; affiliateId: string | null },
): FilteredCompanyData {
  const { since, affiliateId } = options;

  const bookingInWindow = (booking: CompanyDataState["bookings"][number]) => {
    if (affiliateId && booking.affiliate_id !== affiliateId) return false;
    if (!since) return true;
    const anchor = booking.departure ?? booking.arrival ?? booking.lodgify_created_at ?? booking.created_at;
    if (!anchor) return false;
    return new Date(anchor as string).getTime() >= since.getTime();
  };

  const commissionInWindow = (commission: CompanyDataState["commissions"][number]) => {
    if (affiliateId && commission.affiliate_id !== affiliateId) return false;
    if (!since) return true;
    const anchor = commission.paid_at ?? commission.eligible_at ?? commission.created_at;
    if (!anchor) return false;
    return new Date(anchor as string).getTime() >= since.getTime();
  };

  const unmatchedInWindow = (row: CompanyDataState["unmatchedPromotions"][number]) => {
    if (affiliateId) return false;
    if (!since) return true;
    const anchor = row.created_at;
    if (!anchor) return false;
    return new Date(anchor as string).getTime() >= since.getTime();
  };

  return {
    ...data,
    affiliates: affiliateId ? data.affiliates.filter((a) => a.id === affiliateId) : data.affiliates,
    promotions: affiliateId ? data.promotions.filter((p) => p.affiliate_id === affiliateId) : data.promotions,
    bookings: data.bookings.filter(bookingInWindow),
    commissions: data.commissions.filter(commissionInWindow),
    unmatchedPromotions: data.unmatchedPromotions.filter(unmatchedInWindow),
  } as CompanyDataState;
}
