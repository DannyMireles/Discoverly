import Link from "next/link";
import { BadgeDollarSign, CalendarCheck2, CreditCard, DollarSign, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatCard } from "@/components/dashboard/stat-card";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { DashboardSurface } from "@/components/dashboard/dashboard-surface";
import { DemoDataButtons } from "@/components/company/demo-data-buttons";
import { getCompanyData, summarizeCompany } from "@/lib/company/data";
import {
  commissionStatusBreakdown,
  monthlyRevenueSeries,
  topAffiliatesByRevenue,
  topPropertiesByRevenue,
} from "@/lib/company/charts";
import {
  applyDashboardFilters,
  parsePeriod,
  periodMonths,
  periodSince,
} from "@/lib/company/filters";
import { isDemoToolsEnabled } from "@/lib/demo/tools";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export default async function CompanyDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; affiliate?: string }>;
}) {
  const data = await getCompanyData();
  const params = await searchParams;
  const period = parsePeriod(params.period);
  const affiliateId = params.affiliate && params.affiliate !== "all" ? params.affiliate : null;
  const filtered = applyDashboardFilters(data, {
    since: periodSince(period),
    affiliateId,
  });
  const summary = summarizeCompany(filtered);
  const paidMatchedBookings = filtered.bookings.filter(
    (booking) => booking.is_fully_paid && booking.is_affiliate_matched,
  );

  const monthly = monthlyRevenueSeries(filtered, periodMonths(period));
  const topAffiliates = topAffiliatesByRevenue(filtered);
  const topProperties = topPropertiesByRevenue(filtered);
  const commissionStatus = commissionStatusBreakdown(filtered);
  const affiliateNameById = Object.fromEntries(
    data.affiliates.map((a) => [a.id as string, a.name as string]),
  );

  return (
    <AppShell
      title="Company Dashboard"
      description="Affiliate-attributed paid bookings from Lodgify."
      actions={data.company && isDemoToolsEnabled() ? <DemoDataButtons companyId={data.company.id} /> : null}
    >
      <div className="space-y-8">
        {!data.configured ? (
          <Banner title="Dashboard is temporarily unavailable" tone="warning">
            Please try again shortly or contact support if this continues.
          </Banner>
        ) : !data.user ? (
          <Banner
            title="Sign in required"
            tone="warning"
            action={<Link href="/auth"><Button>Sign In</Button></Link>}
          >
            Sign in before completing company setup.
          </Banner>
        ) : !data.company ? (
          <Banner
            title="Onboarding is not done"
            tone="warning"
            action={<Link href="/company/onboarding"><Button>Start Setup</Button></Link>}
          >
            Complete company setup and connect your services.
          </Banner>
        ) : data.affiliates.length === 0 ? (
          <Banner
            title="Invite your first affiliate to start tracking direct booking revenue."
            action={<Link href="/company/affiliates/new"><Button>New Affiliate</Button></Link>}
          >
            Add the affiliate, confirm their booking code, then send the invite when you are ready.
          </Banner>
        ) : null}

        {data.company ? (
          <DashboardFilters
            period={period}
            affiliateId={affiliateId}
            affiliates={data.affiliates.map((a) => ({ id: a.id as string, name: a.name as string }))}
          />
        ) : null}

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Affiliate Revenue Driven"
            value={formatCurrency(summary.revenueDriven)}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <StatCard
            label="Paid Bookings Driven"
            value={String(summary.paidBookings)}
            icon={<CalendarCheck2 className="h-5 w-5" />}
            tone="green"
          />
          <StatCard
            label="Pending Payouts"
            value={formatCurrency(summary.pendingPayouts)}
            icon={<BadgeDollarSign className="h-5 w-5" />}
            tone="amber"
          />
          <StatCard
            label="Paid This Month"
            value={formatCurrency(summary.paidThisMonth)}
            icon={<CreditCard className="h-5 w-5" />}
            tone="green"
          />
          <StatCard
            label="Active Affiliates"
            value={String(summary.activeAffiliates)}
            icon={<Users className="h-5 w-5" />}
            tone="slate"
          />
        </section>

        <DashboardSurface
          monthly={monthly}
          topAffiliates={topAffiliates}
          topProperties={topProperties}
          commissionStatus={commissionStatus}
          bookings={filtered.bookings.map((b) => ({
            id: b.id as string,
            lodgify_booking_id: b.lodgify_booking_id ?? null,
            guest_name: (b.guest_name as string | null) ?? null,
            arrival: (b.arrival as string | null) ?? null,
            departure: (b.departure as string | null) ?? null,
            stay_subtotal: b.stay_subtotal ?? null,
            amount_paid: b.amount_paid ?? null,
            promotion_description: (b.promotion_description as string | null) ?? null,
            affiliate_id: (b.affiliate_id as string | null) ?? null,
            property_id: b.property_id ?? null,
            is_fully_paid: Boolean(b.is_fully_paid),
            is_affiliate_matched: Boolean(b.is_affiliate_matched),
          }))}
          commissions={filtered.commissions.map((c) => ({
            id: c.id as string,
            affiliate_id: (c.affiliate_id as string | null) ?? null,
            lodgify_booking_id: c.lodgify_booking_id as string,
            status: c.status as string,
            commission_amount: c.commission_amount ?? null,
            created_at: (c.created_at as string | null) ?? null,
            eligible_at: (c.eligible_at as string | null) ?? null,
            paid_at: (c.paid_at as string | null) ?? null,
          }))}
          affiliateNameById={affiliateNameById}
        />

        <section className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Affiliates</CardTitle></CardHeader>
            <CardContent className="p-0">
              {filtered.affiliates.length === 0 ? (
                <div className="p-8 text-sm text-slate-500">No affiliates in this filter.</div>
              ) : (
                <Table>
                  <THead>
                    <TR><TH>Affiliate</TH><TH>Email</TH><TH>Status</TH><TH>Stripe</TH></TR>
                  </THead>
                  <TBody>
                    {filtered.affiliates.map((affiliate) => (
                      <TR key={affiliate.id}>
                        <TD className="font-medium text-slate-950">{affiliate.name}</TD>
                        <TD>{affiliate.email}</TD>
                        <TD><StatusBadge status={affiliate.status} /></TD>
                        <TD><StatusBadge status={affiliate.stripe_connected ? "Connected" : "Needs Stripe"} /></TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Unmatched Promotions</CardTitle></CardHeader>
            <CardContent className="p-0">
              {filtered.unmatchedPromotions.length === 0 ? (
                <div className="p-8 text-sm text-slate-500">No unmatched Lodgify promotions in this filter.</div>
              ) : (
                <Table>
                  <THead><TR><TH>Promotion</TH><TH>Status</TH><TH>Amount</TH></TR></THead>
                  <TBody>
                    {filtered.unmatchedPromotions.map((promotion) => (
                      <TR key={promotion.id}>
                        <TD className="font-mono text-xs">{promotion.promotion_description}</TD>
                        <TD><StatusBadge status={promotion.status} /></TD>
                        <TD>{formatCurrency(Number(promotion.promotion_amount ?? 0))}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader><CardTitle>Recent Affiliate Bookings</CardTitle></CardHeader>
          <CardContent className="p-0">
            {paidMatchedBookings.length === 0 ? (
              <div className="p-8 text-sm text-slate-500">No fully paid matched bookings in this filter.</div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Lodgify Booking ID</TH><TH>Guest</TH><TH>Stay Dates</TH><TH>Promotion Description</TH><TH>Stay Subtotal</TH><TH>Total Paid</TH><TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {paidMatchedBookings.map((booking) => (
                    <TR key={booking.id}>
                      <TD>{booking.lodgify_booking_id}</TD>
                      <TD>{booking.guest_name ?? "Guest"}</TD>
                      <TD>{formatDate(booking.arrival)} - {formatDate(booking.departure)}</TD>
                      <TD className="font-mono text-xs">{booking.promotion_description}</TD>
                      <TD>{formatCurrency(Number(booking.stay_subtotal ?? 0))}</TD>
                      <TD>{formatCurrency(Number(booking.amount_paid ?? 0))}</TD>
                      <TD><StatusBadge status={booking.booking_status ?? "synced"} /></TD>
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
