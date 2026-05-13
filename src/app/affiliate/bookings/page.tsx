import { AppShell } from "@/components/layout/app-shell";
import { AffiliateStripeConnectBanner } from "@/components/affiliate/stripe-connect-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getAffiliateData } from "@/lib/company/data";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export default async function AffiliateBookingsPage() {
  const data = await getAffiliateData();

  return (
    <AppShell title="Affiliate Bookings" description="Guest contact details are hidden." section="affiliate">
      <div className="space-y-6">
        {data.affiliate && !data.affiliate.stripe_connected ? (
          <AffiliateStripeConnectBanner
            affiliateId={data.affiliate.id}
            email={data.affiliate.email}
            returnPath="/affiliate/bookings"
          />
        ) : null}
        <Card>
          <CardHeader><CardTitle>Paid Bookings Driven</CardTitle></CardHeader>
          <CardContent className="p-0">
            {data.bookings.length === 0 ? (
              <div className="p-8 text-sm text-slate-500">No paid bookings driven yet.</div>
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
