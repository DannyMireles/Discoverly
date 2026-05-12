import Link from "next/link";
import { BadgeDollarSign, CalendarCheck2, CreditCard, DollarSign, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  BookingsBarChart,
  CommissionStatusChart,
  RevenueOverTimeChart,
  TopAffiliatesChart,
} from "@/components/dashboard/dashboard-charts";
import { DemoDataButtons } from "@/components/company/demo-data-buttons";
import { getCompanyData, summarizeCompany } from "@/lib/company/data";
import {
  commissionStatusBreakdown,
  monthlyRevenueSeries,
  topAffiliatesByRevenue,
} from "@/lib/company/charts";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export default async function CompanyDashboardPage() {
  const data = await getCompanyData();
  const summary = summarizeCompany(data);
  const paidMatchedBookings = data.bookings.filter(
    (booking) => booking.is_fully_paid && booking.is_affiliate_matched,
  );

  const monthly = monthlyRevenueSeries(data);
  const topAffiliates = topAffiliatesByRevenue(data);
  const commissionStatus = commissionStatusBreakdown(data);

  return (
    <AppShell
      title="Company Dashboard"
      description="Fully paid, matched Lodgify bookings only."
      actions={data.company ? <DemoDataButtons companyId={data.company.id} /> : null}
    >
      <div className="space-y-8">
        {!data.configured ? (
          <Banner title="Supabase is not configured" tone="warning">
            Add `.env.local`, restart the dev server, then return here.
          </Banner>
        ) : !data.user ? (
          <Banner
            title="Sign in required"
            tone="warning"
            action={<Link href="/auth"><Button>Go to Auth</Button></Link>}
          >
            Create your admin account before onboarding Zenful Cove.
          </Banner>
        ) : !data.company ? (
          <Banner
            title="Onboarding is not done"
            tone="warning"
            action={<Link href="/company/onboarding"><Button>Start Onboarding</Button></Link>}
          >
            Create Zenful Cove and connect your services.
          </Banner>
        ) : data.affiliates.length === 0 ? (
          <Banner
            title="Invite your first affiliate to start tracking direct booking revenue."
            action={<Link href="/company/affiliates/new"><Button>New Affiliate</Button></Link>}
          >
            Create the affiliate record, copy the exact Lodgify promotion name, then mark setup complete after it
            exists in Lodgify.
          </Banner>
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

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <RevenueOverTimeChart data={monthly} />
          </div>
          <BookingsBarChart data={monthly} />
        </section>

        <section className="grid gap-6 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <TopAffiliatesChart data={topAffiliates} />
          </div>
          <div className="xl:col-span-2">
            <CommissionStatusChart data={commissionStatus} />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Affiliates</CardTitle></CardHeader>
            <CardContent className="p-0">
              {data.affiliates.length === 0 ? (
                <div className="p-8 text-sm text-slate-500">No affiliates yet.</div>
              ) : (
                <Table>
                  <THead>
                    <TR><TH>Affiliate</TH><TH>Email</TH><TH>Status</TH><TH>Stripe</TH></TR>
                  </THead>
                  <TBody>
                    {data.affiliates.map((affiliate) => (
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
              {data.unmatchedPromotions.length === 0 ? (
                <div className="p-8 text-sm text-slate-500">No unmatched Lodgify promotions.</div>
              ) : (
                <Table>
                  <THead><TR><TH>Promotion</TH><TH>Status</TH><TH>Amount</TH></TR></THead>
                  <TBody>
                    {data.unmatchedPromotions.map((promotion) => (
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
              <div className="p-8 text-sm text-slate-500">No fully paid matched bookings yet.</div>
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
