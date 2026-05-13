import Link from "next/link";
import { BadgeDollarSign, CalendarCheck2, DollarSign, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CopyField } from "@/components/ui/copy-field";
import { AffiliateFilters } from "@/components/affiliate/affiliate-filters";
import { AffiliateSurface } from "@/components/affiliate/affiliate-surface";
import { AffiliateStripeConnectBanner } from "@/components/affiliate/stripe-connect-banner";
import { getAffiliateData } from "@/lib/company/data";
import {
  affiliateCommissionStatus,
  affiliateMonthlySeries,
  affiliateTopProperties,
  filterAffiliateBySince,
} from "@/lib/affiliate/charts";
import { parsePeriod, periodMonths, periodSince } from "@/lib/company/filters";
import { formatCurrency, formatOrdinalDay } from "@/lib/utils/format";

export default async function AffiliateDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; period?: string }>;
}) {
  const data = await getAffiliateData();
  const params = await searchParams;
  const period = parsePeriod(params.period);
  const since = periodSince(period);

  const bookings = filterAffiliateBySince(data.bookings, since, ["departure", "arrival", "booking_date"]);
  const commissions = filterAffiliateBySince(data.commissions, since, ["paid_at", "eligible_at", "created_at"]);

  const revenueDriven = bookings.reduce((sum, booking) => sum + Number(booking.stay_subtotal ?? 0), 0);
  const pending = commissions.filter((c) => c.status !== "paid").reduce((sum, c) => sum + Number(c.commission_amount ?? 0), 0);
  const paid = commissions.filter((c) => c.status === "paid").reduce((sum, c) => sum + Number(c.commission_amount ?? 0), 0);

  const monthly = affiliateMonthlySeries(bookings, commissions, periodMonths(period));
  const topProperties = affiliateTopProperties(bookings);
  const commissionStatus = affiliateCommissionStatus(commissions);

  return (
    <AppShell
      title="Affiliate Dashboard"
      description="Revenue, paid bookings, and pending earnings."
      section="affiliate"
    >
      <div className="space-y-8">
        {!data.user ? (
          <Banner
            title="Sign in required"
            tone="warning"
            action={<Link href="/auth"><Button>Go to Auth</Button></Link>}
          >
            Accept your invite or sign in to see affiliate data.
          </Banner>
        ) : !data.affiliate || !data.promotion ? (
          <Banner title="No affiliate profile linked yet" tone="warning">
            Accept an invite link to connect your account to an affiliate record.
          </Banner>
        ) : !data.affiliate.stripe_connected ? (
          <AffiliateStripeConnectBanner
            affiliateId={data.affiliate.id}
            email={data.affiliate.email}
            justAccepted={params.invite === "accepted"}
          />
        ) : null}

        {data.promotion ? (
          <Card>
            <CardContent className="grid gap-5 p-6 lg:grid-cols-2">
              <CopyField label="Your code" value={data.promotion.public_code} />
              <CopyField label="Booking page" value={data.company?.booking_site_url ?? "Not configured"} />
            </CardContent>
          </Card>
        ) : null}

        {data.affiliate ? <AffiliateFilters period={period} /> : null}

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Revenue Driven" value={formatCurrency(revenueDriven)} icon={<DollarSign className="h-5 w-5" />} />
          <StatCard label="Paid Bookings" value={String(bookings.length)} icon={<CalendarCheck2 className="h-5 w-5" />} tone="green" />
          <StatCard label="Pending Earnings" value={formatCurrency(pending)} icon={<BadgeDollarSign className="h-5 w-5" />} tone="amber" />
          <StatCard label="Paid Earnings" value={formatCurrency(paid)} icon={<Wallet className="h-5 w-5" />} tone="green" />
          <StatCard
            label="Next Payout Date"
            value={formatOrdinalDay(data.company?.payout_pay_by_day ?? null, "—")}
            detail="Monthly review"
            tone="slate"
          />
        </section>

        {data.affiliate ? (
          <AffiliateSurface
            monthly={monthly}
            topProperties={topProperties}
            commissionStatus={commissionStatus}
            bookings={bookings.map((b) => ({
              booking_id: b.booking_id as string,
              property_name: (b.property_name as string | null) ?? null,
              booking_date: (b.booking_date as string | null) ?? null,
              arrival: (b.arrival as string | null) ?? null,
              departure: (b.departure as string | null) ?? null,
              booking_total: b.booking_total ?? null,
              stay_subtotal: b.stay_subtotal ?? null,
              commission_amount: b.commission_amount ?? null,
              commission_status: (b.commission_status as string | null) ?? null,
            }))}
            commissions={commissions.map((c) => ({
              id: c.id as string,
              status: c.status as string,
              commission_amount: c.commission_amount ?? null,
              paid_at: (c.paid_at as string | null) ?? null,
              eligible_at: (c.eligible_at as string | null) ?? null,
              created_at: (c.created_at as string | null) ?? null,
            }))}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
