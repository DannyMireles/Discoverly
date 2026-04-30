import Link from "next/link";
import { BadgeDollarSign, CalendarCheck2, DollarSign, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyField } from "@/components/ui/copy-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getAffiliateData } from "@/lib/company/data";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export default async function AffiliateDashboardPage() {
  const data = await getAffiliateData();
  const revenueDriven = data.bookings.reduce((sum, booking) => sum + Number(booking.stay_subtotal ?? 0), 0);
  const pending = data.commissions.filter((commission) => commission.status !== "paid").reduce((sum, commission) => sum + Number(commission.commission_amount ?? 0), 0);
  const paid = data.commissions.filter((commission) => commission.status === "paid").reduce((sum, commission) => sum + Number(commission.commission_amount ?? 0), 0);

  return (
    <AppShell title="Affiliate Dashboard" description="Revenue, paid bookings, and pending earnings." section="affiliate">
      <div className="space-y-8">
        {!data.user ? (
          <Banner title="Sign in required" tone="warning" action={<Link href="/auth"><Button>Go to Auth</Button></Link>}>Accept your invite or sign in to see affiliate data.</Banner>
        ) : !data.affiliate || !data.promotion ? (
          <Banner title="No affiliate profile linked yet" tone="warning">Accept an invite link to connect your account to an affiliate record.</Banner>
        ) : !data.affiliate.stripe_connected ? (
          <Banner title="Connect Stripe to receive payouts." tone="warning" action={<Button>Connect Stripe</Button>}>
            Your earnings will be tracked, but payouts are paused until Stripe is connected.
          </Banner>
        ) : null}
        {data.promotion ? (
          <Card>
            <CardContent className="grid gap-5 p-6 lg:grid-cols-2">
              <CopyField label="Your code" value={data.promotion.public_code} />
              <CopyField label="Booking page" value={data.company?.booking_site_url ?? "Not configured"} />
            </CardContent>
          </Card>
        ) : null}
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Revenue Driven" value={formatCurrency(revenueDriven)} icon={<DollarSign className="h-5 w-5" />} />
          <StatCard label="Paid Bookings" value={String(data.bookings.length)} icon={<CalendarCheck2 className="h-5 w-5" />} tone="green" />
          <StatCard label="Pending Earnings" value={formatCurrency(pending)} icon={<BadgeDollarSign className="h-5 w-5" />} tone="amber" />
          <StatCard label="Paid Earnings" value={formatCurrency(paid)} icon={<Wallet className="h-5 w-5" />} tone="green" />
          <StatCard label="Next Payout Date" value="3rd" detail="Monthly review" tone="slate" />
        </section>
        <Card>
          <CardHeader><CardTitle>Recent Paid Bookings</CardTitle></CardHeader>
          <CardContent className="p-0">
            {data.bookings.length === 0 ? (
              <div className="p-8 text-sm text-slate-500">Share your code to start earning on paid bookings.</div>
            ) : (
              <Table>
                <THead><TR><TH>Booking Date</TH><TH>Stay Dates</TH><TH>Property</TH><TH>Booking Amount</TH><TH>Commission</TH><TH>Status</TH></TR></THead>
                <TBody>
                  {data.bookings.map((booking) => (
                    <TR key={booking.booking_id}>
                      <TD>{formatDate(booking.booking_date)}</TD>
                      <TD>{formatDate(booking.arrival)} - {formatDate(booking.departure)}</TD>
                      <TD>{booking.property_name ?? "Property"}</TD>
                      <TD>{formatCurrency(Number(booking.booking_total ?? 0))}</TD>
                      <TD>{formatCurrency(Number(booking.commission_amount ?? 0))}</TD>
                      <TD><StatusBadge status={booking.commission_status ?? "pending"} /></TD>
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
