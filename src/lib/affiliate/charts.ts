import type { MonthlyRevenuePoint, TopPropertyPoint, CommissionStatusPoint } from "@/lib/company/charts";

export type AffiliateBookingRow = {
  booking_id: string;
  property_name: string | null;
  booking_date: string | null;
  arrival: string | null;
  departure: string | null;
  booking_total: number | string | null;
  stay_subtotal: number | string | null;
  commission_amount: number | string | null;
  commission_status: string | null;
};

export type AffiliateCommissionRow = {
  id: string;
  status: string;
  commission_amount: number | string | null;
  paid_at: string | null;
  eligible_at: string | null;
  created_at: string | null;
};

function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", { month: "short", year: "2-digit" });
}

export function affiliateMonthlySeries(
  bookings: AffiliateBookingRow[],
  commissions: AffiliateCommissionRow[],
  months = 6,
): MonthlyRevenuePoint[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(monthKey(d));
  }

  const buckets = new Map<string, { revenue: number; bookings: number; commissionsPaid: number; commissionsAccrued: number }>();
  for (const key of keys) buckets.set(key, { revenue: 0, bookings: 0, commissionsPaid: 0, commissionsAccrued: 0 });

  for (const booking of bookings) {
    const anchor = booking.departure ?? booking.arrival ?? booking.booking_date;
    if (!anchor) continue;
    const key = monthKey(new Date(anchor));
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.revenue += Number(booking.stay_subtotal ?? 0);
    bucket.bookings += 1;
  }

  for (const commission of commissions) {
    const anchor = commission.paid_at ?? commission.eligible_at ?? commission.created_at;
    if (!anchor) continue;
    const key = monthKey(new Date(anchor));
    const bucket = buckets.get(key);
    if (!bucket) continue;
    const amount = Number(commission.commission_amount ?? 0);
    if (commission.status === "paid") bucket.commissionsPaid += amount;
    if (["pending", "eligible", "approved", "held"].includes(commission.status)) bucket.commissionsAccrued += amount;
  }

  return keys.map((key) => {
    const value = buckets.get(key) ?? { revenue: 0, bookings: 0, commissionsPaid: 0, commissionsAccrued: 0 };
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

export function affiliateTopProperties(bookings: AffiliateBookingRow[], limit = 5): TopPropertyPoint[] {
  const totals = new Map<string, TopPropertyPoint>();
  for (const booking of bookings) {
    const id = booking.property_name ?? "Unknown property";
    const entry = totals.get(id) ?? { propertyId: id, revenue: 0, bookings: 0 };
    entry.revenue += Number(booking.stay_subtotal ?? 0);
    entry.bookings += 1;
    totals.set(id, entry);
  }
  return Array.from(totals.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
    .map((row) => ({ ...row, revenue: Number(row.revenue.toFixed(2)) }));
}

const STATUS_ORDER = ["pending", "eligible", "approved", "paid", "held", "canceled", "clawback_needed"];

export function affiliateCommissionStatus(commissions: AffiliateCommissionRow[]): CommissionStatusPoint[] {
  const totals = new Map<string, CommissionStatusPoint>();
  for (const c of commissions) {
    const status = c.status ?? "pending";
    const bucket = totals.get(status) ?? { status, count: 0, total: 0 };
    bucket.count += 1;
    bucket.total += Number(c.commission_amount ?? 0);
    totals.set(status, bucket);
  }
  return Array.from(totals.values())
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
    .map((row) => ({ ...row, total: Number(row.total.toFixed(2)) }));
}

export function filterAffiliateBySince<T extends { paid_at?: string | null; eligible_at?: string | null; created_at?: string | null; departure?: string | null; arrival?: string | null; booking_date?: string | null }>(
  rows: T[],
  since: Date | null,
  anchors: Array<keyof T>,
): T[] {
  if (!since) return rows;
  return rows.filter((row) => {
    for (const key of anchors) {
      const value = row[key];
      if (typeof value === "string" && value) {
        return new Date(value).getTime() >= since.getTime();
      }
    }
    return false;
  });
}
