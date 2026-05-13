"use client";

import { useMemo, useState } from "react";
import {
  BookingsBarChart,
  CommissionStatusChart,
  RevenueOverTimeChart,
  TopPropertiesChart,
} from "@/components/dashboard/dashboard-charts";
import { DrilldownModal } from "@/components/dashboard/drilldown-modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type {
  CommissionStatusPoint,
  MonthlyRevenuePoint,
  TopPropertyPoint,
} from "@/lib/company/charts";
import type { AffiliateBookingRow, AffiliateCommissionRow } from "@/lib/affiliate/charts";
import { formatCurrency, formatDate } from "@/lib/utils/format";

type Drilldown =
  | null
  | { kind: "month"; monthKey: string; label: string }
  | { kind: "property"; propertyId: string }
  | { kind: "status"; status: string };

export function AffiliateSurface({
  monthly,
  topProperties,
  commissionStatus,
  bookings,
  commissions,
}: {
  monthly: MonthlyRevenuePoint[];
  topProperties: TopPropertyPoint[];
  commissionStatus: CommissionStatusPoint[];
  bookings: AffiliateBookingRow[];
  commissions: AffiliateCommissionRow[];
}) {
  const [drill, setDrill] = useState<Drilldown>(null);

  const bookingsByMonth = useMemo(() => bucketBy(bookings, monthKeyOfBooking), [bookings]);
  const commissionsByMonth = useMemo(() => bucketBy(commissions, monthKeyOfCommission), [commissions]);

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueOverTimeChart
            data={monthly}
            onMonthClick={(p) => setDrill({ kind: "month", monthKey: p.month, label: p.label })}
          />
        </div>
        <BookingsBarChart
          data={monthly}
          onMonthClick={(p) => setDrill({ kind: "month", monthKey: p.month, label: p.label })}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <TopPropertiesChart
            data={topProperties}
            onPropertyClick={(p) => setDrill({ kind: "property", propertyId: p.propertyId })}
          />
        </div>
        <CommissionStatusChart
          data={commissionStatus}
          onStatusClick={(p) => setDrill({ kind: "status", status: p.status })}
        />
      </section>

      <DrilldownModal
        open={drill !== null}
        onClose={() => setDrill(null)}
        title={drill ? titleFor(drill) : ""}
        subtitle={drill ? subtitleFor(drill) : undefined}
      >
        {drill ? (
          <DrilldownBody
            kind={drill.kind}
            bookings={
              drill.kind === "month"
                ? bookingsByMonth.get(drill.monthKey) ?? []
                : drill.kind === "property"
                  ? bookings.filter((b) => (b.property_name ?? "Unknown property") === drill.propertyId)
                  : []
            }
            commissions={
              drill.kind === "month"
                ? commissionsByMonth.get(drill.monthKey) ?? []
                : drill.kind === "status"
                  ? commissions.filter((c) => c.status === drill.status)
                  : []
            }
          />
        ) : null}
      </DrilldownModal>
    </div>
  );
}

function DrilldownBody({
  kind,
  bookings,
  commissions,
}: {
  kind: "month" | "property" | "status";
  bookings: AffiliateBookingRow[];
  commissions: AffiliateCommissionRow[];
}) {
  const revenue = bookings.reduce((sum, b) => sum + Number(b.stay_subtotal ?? 0), 0);
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

      {kind !== "status" ? (
        <Section title={`Bookings · ${bookings.length}`}>
          {bookings.length === 0 ? (
            <EmptyRow message="No bookings in this slice." />
          ) : (
            <Table maxHeight={420}>
              <THead>
                <TR>
                  <TH>Property</TH>
                  <TH className="whitespace-nowrap">Stay</TH>
                  <TH className="text-right">Subtotal</TH>
                  <TH className="text-right">Commission</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {bookings.map((b) => (
                  <TR key={b.booking_id}>
                    <TD>{b.property_name ?? "—"}</TD>
                    <TD className="whitespace-nowrap text-xs text-slate-600">
                      {formatDate(b.arrival)} → {formatDate(b.departure)}
                    </TD>
                    <TD className="text-right tabular-nums">{formatCurrency(Number(b.stay_subtotal ?? 0))}</TD>
                    <TD className="text-right tabular-nums">{formatCurrency(Number(b.commission_amount ?? 0))}</TD>
                    <TD>
                      <StatusBadge status={b.commission_status ?? "pending"} />
                    </TD>
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
                <TH>Status</TH>
                <TH className="text-right">Amount</TH>
                <TH className="whitespace-nowrap">Eligible</TH>
                <TH className="whitespace-nowrap">Paid</TH>
              </TR>
            </THead>
            <TBody>
              {commissions.map((c) => (
                <TR key={c.id}>
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
  return (
    <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
      {message}
    </p>
  );
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

function monthKeyOfBooking(b: AffiliateBookingRow): string | null {
  const anchor = b.departure ?? b.arrival ?? b.booking_date;
  if (!anchor) return null;
  return monthKey(new Date(anchor));
}

function monthKeyOfCommission(c: AffiliateCommissionRow): string | null {
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
    case "property":
      return drill.propertyId;
    case "status":
      return drill.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
}

function subtitleFor(drill: NonNullable<Drilldown>): string | undefined {
  switch (drill.kind) {
    case "month":
      return "Your bookings and commissions in this month within the current filter.";
    case "property":
      return "Your bookings and commissions tied to this property within the current filter.";
    case "status":
      return "Commissions currently in this state.";
  }
}
