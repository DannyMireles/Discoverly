"use client";

import { useMemo, useState } from "react";
import {
  BookingsBarChart,
  CommissionStatusChart,
  RevenueOverTimeChart,
  TopAffiliatesChart,
  TopPropertiesChart,
} from "@/components/dashboard/dashboard-charts";
import { DrilldownModal } from "@/components/dashboard/drilldown-modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type {
  CommissionStatusPoint,
  MonthlyRevenuePoint,
  TopAffiliatePoint,
  TopPropertyPoint,
} from "@/lib/company/charts";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export type BookingRow = {
  id: string;
  lodgify_booking_id: number | string | null;
  guest_name: string | null;
  arrival: string | null;
  departure: string | null;
  stay_subtotal: number | string | null;
  amount_paid: number | string | null;
  promotion_description: string | null;
  affiliate_id: string | null;
  property_id: number | string | null;
  is_fully_paid: boolean;
  is_affiliate_matched: boolean;
};

export type CommissionRow = {
  id: string;
  affiliate_id: string | null;
  lodgify_booking_id: string;
  status: string;
  commission_amount: number | string | null;
  created_at: string | null;
  eligible_at: string | null;
  paid_at: string | null;
};

type Props = {
  monthly: MonthlyRevenuePoint[];
  topAffiliates: TopAffiliatePoint[];
  topProperties: TopPropertyPoint[];
  commissionStatus: CommissionStatusPoint[];
  bookings: BookingRow[];
  commissions: CommissionRow[];
  affiliateNameById: Record<string, string>;
};

type Drilldown =
  | null
  | { kind: "month"; monthKey: string; label: string }
  | { kind: "affiliate"; affiliateId: string; name: string }
  | { kind: "property"; propertyId: string }
  | { kind: "status"; status: string };

export function DashboardSurface(props: Props) {
  const [drill, setDrill] = useState<Drilldown>(null);

  const bookingsByMonth = useMemo(() => bucketBy(props.bookings, monthKeyOfBooking), [props.bookings]);
  const commissionsByMonth = useMemo(() => bucketBy(props.commissions, monthKeyOfCommission), [props.commissions]);

  function close() {
    setDrill(null);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueOverTimeChart data={props.monthly} onMonthClick={(p) => setDrill({ kind: "month", monthKey: p.month, label: p.label })} />
        </div>
        <BookingsBarChart data={props.monthly} onMonthClick={(p) => setDrill({ kind: "month", monthKey: p.month, label: p.label })} />
      </section>

      <section className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <TopAffiliatesChart
            data={props.topAffiliates}
            onAffiliateClick={(p) => setDrill({ kind: "affiliate", affiliateId: p.affiliateId, name: p.name })}
          />
        </div>
        <div className="xl:col-span-2">
          <TopPropertiesChart
            data={props.topProperties}
            onPropertyClick={(p) => setDrill({ kind: "property", propertyId: p.propertyId })}
          />
        </div>
        <div className="xl:col-span-1">
          <CommissionStatusChart
            data={props.commissionStatus}
            onStatusClick={(p) => setDrill({ kind: "status", status: p.status })}
          />
        </div>
      </section>

      <DrilldownModal
        open={drill !== null}
        onClose={close}
        title={drill ? titleFor(drill) : ""}
        subtitle={drill ? subtitleFor(drill, props) : undefined}
      >
        {drill ? (
          <DrilldownBody
            drill={drill}
            bookings={
              drill.kind === "month"
                ? bookingsByMonth.get(drill.monthKey) ?? []
                : drill.kind === "affiliate"
                  ? props.bookings.filter((b) => b.affiliate_id === drill.affiliateId)
                  : drill.kind === "property"
                    ? props.bookings.filter((b) => String(b.property_id ?? "Unknown") === drill.propertyId)
                    : []
            }
            commissions={
              drill.kind === "month"
                ? commissionsByMonth.get(drill.monthKey) ?? []
                : drill.kind === "affiliate"
                  ? props.commissions.filter((c) => c.affiliate_id === drill.affiliateId)
                  : drill.kind === "status"
                    ? props.commissions.filter((c) => c.status === drill.status)
                    : []
            }
            affiliateNameById={props.affiliateNameById}
          />
        ) : null}
      </DrilldownModal>
    </div>
  );
}

function DrilldownBody({
  drill,
  bookings,
  commissions,
  affiliateNameById,
}: {
  drill: Drilldown;
  bookings: BookingRow[];
  commissions: CommissionRow[];
  affiliateNameById: Record<string, string>;
}) {
  const revenue = bookings
    .filter((b) => b.is_fully_paid && b.is_affiliate_matched)
    .reduce((sum, b) => sum + Number(b.stay_subtotal ?? 0), 0);
  const totalCommission = commissions.reduce((sum, c) => sum + Number(c.commission_amount ?? 0), 0);
  const commissionPaid = commissions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + Number(c.commission_amount ?? 0), 0);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Revenue driven" value={formatCurrency(revenue)} />
        <Stat label="Commission accrued" value={formatCurrency(totalCommission)} />
        <Stat label="Commission paid" value={formatCurrency(commissionPaid)} />
      </div>

      {drill?.kind !== "status" ? (
        <Section title={`Bookings · ${bookings.length}`}>
          {bookings.length === 0 ? (
            <EmptyRow message="No bookings in this slice." />
          ) : (
            <Table maxHeight={420}>
              <THead>
                <TR>
                  <TH className="w-32">Booking</TH>
                  <TH>Guest</TH>
                  <TH>Affiliate</TH>
                  <TH className="whitespace-nowrap">Stay</TH>
                  <TH className="text-right">Subtotal</TH>
                  <TH className="text-right">Paid</TH>
                </TR>
              </THead>
              <TBody>
                {bookings.map((b) => (
                  <TR key={b.id}>
                    <TD className="font-mono text-xs text-slate-600">{b.lodgify_booking_id ?? "—"}</TD>
                    <TD>{b.guest_name ?? "—"}</TD>
                    <TD>{b.affiliate_id ? affiliateNameById[b.affiliate_id] ?? "—" : "—"}</TD>
                    <TD className="whitespace-nowrap text-xs text-slate-600">
                      {formatDate(b.arrival)} → {formatDate(b.departure)}
                    </TD>
                    <TD className="text-right tabular-nums">{formatCurrency(Number(b.stay_subtotal ?? 0))}</TD>
                    <TD className="text-right tabular-nums">{formatCurrency(Number(b.amount_paid ?? 0))}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Section>
      ) : null}

      <Section title={`Commissions · ${commissions.length}`}>
        {commissions.length === 0 ? (
          <EmptyRow message="No commissions in this slice." />
        ) : (
          <Table maxHeight={420}>
            <THead>
              <TR>
                <TH>Affiliate</TH>
                <TH>Status</TH>
                <TH className="text-right">Amount</TH>
                <TH className="whitespace-nowrap">Eligible</TH>
                <TH className="whitespace-nowrap">Paid</TH>
              </TR>
            </THead>
            <TBody>
              {commissions.map((c) => (
                <TR key={c.id}>
                  <TD>{c.affiliate_id ? affiliateNameById[c.affiliate_id] ?? "—" : "—"}</TD>
                  <TD>
                    <StatusBadge status={c.status} />
                  </TD>
                  <TD className="text-right tabular-nums">{formatCurrency(Number(c.commission_amount ?? 0))}</TD>
                  <TD className="whitespace-nowrap text-xs text-slate-600">{c.eligible_at ? formatDate(c.eligible_at) : "—"}</TD>
                  <TD className="whitespace-nowrap text-xs text-slate-600">{c.paid_at ? formatDate(c.paid_at) : "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">{message}</p>;
}

function bucketBy<T>(rows: T[], keyOf: (row: T) => string | null): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    if (!key) continue;
    const arr = map.get(key) ?? [];
    arr.push(row);
    map.set(key, arr);
  }
  return map;
}

function monthKeyOfBooking(b: BookingRow): string | null {
  const anchor = b.departure ?? b.arrival;
  if (!anchor) return null;
  return monthKey(new Date(anchor));
}

function monthKeyOfCommission(c: CommissionRow): string | null {
  const anchor = c.paid_at ?? c.eligible_at ?? c.created_at;
  if (!anchor) return null;
  return monthKey(new Date(anchor));
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function titleFor(drill: NonNullable<Drilldown>): string {
  switch (drill.kind) {
    case "month":
      return drill.label;
    case "affiliate":
      return drill.name;
    case "property":
      return `Property ${drill.propertyId}`;
    case "status":
      return statusLabel(drill.status);
  }
}

function subtitleFor(drill: NonNullable<Drilldown>, props: Props): string | undefined {
  switch (drill.kind) {
    case "month":
      return "All bookings and commissions in this month within the current filters.";
    case "affiliate":
      return `Bookings and commissions for ${drill.name} within the current filters.`;
    case "property":
      return "Bookings and commissions for this property within the current filters.";
    case "status":
      return `${props.commissionStatus.find((s) => s.status === drill.status)?.count ?? 0} commission(s) in this status.`;
  }
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}
