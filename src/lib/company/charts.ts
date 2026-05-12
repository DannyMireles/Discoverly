import type { CompanyDataState } from "@/lib/company/data";

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", { month: "short", year: "2-digit" });
}

export type MonthlyRevenuePoint = {
  month: string;
  label: string;
  revenue: number;
  bookings: number;
  commissionsPaid: number;
  commissionsAccrued: number;
};

export function monthlyRevenueSeries(data: CompanyDataState, monthsArg = 6): MonthlyRevenuePoint[] {
  const months = Math.max(1, monthsArg);
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(monthKey(d));
  }

  const initial = new Map<string, { revenue: number; bookings: number; commissionsPaid: number; commissionsAccrued: number }>();
  for (const key of keys) initial.set(key, { revenue: 0, bookings: 0, commissionsPaid: 0, commissionsAccrued: 0 });

  for (const booking of data.bookings) {
    if (!booking.is_fully_paid || !booking.is_affiliate_matched) continue;
    const anchor = booking.departure ?? booking.arrival ?? booking.lodgify_created_at;
    if (!anchor) continue;
    const key = monthKey(new Date(anchor as string));
    const bucket = initial.get(key);
    if (!bucket) continue;
    bucket.revenue += Number(booking.stay_subtotal ?? 0);
    bucket.bookings += 1;
  }

  for (const commission of data.commissions) {
    const anchor = commission.paid_at ?? commission.eligible_at ?? commission.created_at;
    if (!anchor) continue;
    const key = monthKey(new Date(anchor as string));
    const bucket = initial.get(key);
    if (!bucket) continue;
    const amount = Number(commission.commission_amount ?? 0);
    if (commission.status === "paid") bucket.commissionsPaid += amount;
    if (["pending", "eligible", "approved", "held"].includes(commission.status as string)) bucket.commissionsAccrued += amount;
  }

  return keys.map((key) => {
    const value = initial.get(key) ?? { revenue: 0, bookings: 0, commissionsPaid: 0, commissionsAccrued: 0 };
    return {
      month: key,
      label: monthLabel(key),
      revenue: Number(value.revenue.toFixed(2)),
      bookings: value.bookings,
      commissionsPaid: Number(value.commissionsPaid.toFixed(2)),
      commissionsAccrued: Number(value.commissionsAccrued.toFixed(2)),
    };
  });
}

export type TopPropertyPoint = {
  propertyId: string;
  revenue: number;
  bookings: number;
};

export function topPropertiesByRevenue(data: CompanyDataState, limit = 5): TopPropertyPoint[] {
  const byProperty = new Map<string, TopPropertyPoint>();
  for (const booking of data.bookings) {
    if (!booking.is_fully_paid || !booking.is_affiliate_matched) continue;
    const id = booking.property_id ? String(booking.property_id) : "Unknown";
    const entry = byProperty.get(id) ?? { propertyId: id, revenue: 0, bookings: 0 };
    entry.revenue += Number(booking.stay_subtotal ?? 0);
    entry.bookings += 1;
    byProperty.set(id, entry);
  }
  return Array.from(byProperty.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
    .map((row) => ({ ...row, revenue: Number(row.revenue.toFixed(2)) }));
}

export type TopAffiliatePoint = {
  affiliateId: string;
  name: string;
  revenue: number;
  commission: number;
  bookings: number;
};

export function topAffiliatesByRevenue(data: CompanyDataState, limit = 5): TopAffiliatePoint[] {
  const byAffiliate = new Map<string, TopAffiliatePoint>();
  const nameById = new Map(data.affiliates.map((a) => [a.id as string, a.name as string]));

  for (const booking of data.bookings) {
    if (!booking.is_fully_paid || !booking.is_affiliate_matched || !booking.affiliate_id) continue;
    const id = booking.affiliate_id as string;
    const entry = byAffiliate.get(id) ?? { affiliateId: id, name: nameById.get(id) ?? "Unknown", revenue: 0, commission: 0, bookings: 0 };
    entry.revenue += Number(booking.stay_subtotal ?? 0);
    entry.bookings += 1;
    byAffiliate.set(id, entry);
  }

  for (const commission of data.commissions) {
    if (!commission.affiliate_id) continue;
    const id = commission.affiliate_id as string;
    const entry = byAffiliate.get(id);
    if (!entry) continue;
    entry.commission += Number(commission.commission_amount ?? 0);
  }

  return Array.from(byAffiliate.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
    .map((row) => ({ ...row, revenue: Number(row.revenue.toFixed(2)), commission: Number(row.commission.toFixed(2)) }));
}

export type CommissionStatusPoint = {
  status: string;
  count: number;
  total: number;
};

const COMMISSION_STATUS_ORDER = ["pending", "eligible", "approved", "paid", "held", "canceled", "clawback_needed"];

export function commissionStatusBreakdown(data: CompanyDataState): CommissionStatusPoint[] {
  const totals = new Map<string, CommissionStatusPoint>();
  for (const commission of data.commissions) {
    const status = (commission.status as string) ?? "pending";
    const bucket = totals.get(status) ?? { status, count: 0, total: 0 };
    bucket.count += 1;
    bucket.total += Number(commission.commission_amount ?? 0);
    totals.set(status, bucket);
  }
  return Array.from(totals.values())
    .sort((a, b) => COMMISSION_STATUS_ORDER.indexOf(a.status) - COMMISSION_STATUS_ORDER.indexOf(b.status))
    .map((row) => ({ ...row, total: Number(row.total.toFixed(2)) }));
}
