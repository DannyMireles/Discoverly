import { CopyField } from "@/components/ui/copy-field";
import { AppShell } from "@/components/layout/app-shell";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getCompanyData } from "@/lib/company/data";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export default async function AffiliateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCompanyData();
  const affiliate = data.affiliates.find((item) => item.id === id);
  const promotion = data.promotions.find((item) => item.affiliate_id === id);
  const commissions = data.commissions.filter((item) => item.affiliate_id === id);
  const bookings = data.bookings.filter((item) => item.affiliate_id === id);

  return (
    <AppShell title={affiliate?.name ?? "Affiliate"} description="Affiliate setup, promotion, bookings, and payout readiness.">
      {!affiliate ? (
        <Banner title="Affiliate not found" tone="warning">This affiliate does not exist for your company.</Banner>
      ) : (
        <div className="space-y-6">
          {!promotion ? (
            <Banner title="No promotion found" tone="warning">Create or repair this affiliate promotion before syncing Lodgify bookings.</Banner>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
              <Card>
                <CardHeader><CardTitle>Promotion Setup</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <CopyField label="Public code" value={promotion.public_code} />
                  <CopyField label="Lodgify promotion name" value={promotion.lodgify_promotion_name} />
                  <div className="flex gap-2">
                    <Button>Mark as Created in Lodgify</Button>
                    <Button variant="secondary">Resend Invite</Button>
                  </div>
                </CardContent>
              </Card>
              <div className="grid gap-4 md:grid-cols-4">
                <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Paid Bookings Driven</p><p className="mt-2 text-2xl font-semibold">{bookings.filter((booking) => booking.is_fully_paid && booking.is_affiliate_matched).length}</p></CardContent></Card>
                <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Revenue Driven</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(bookings.reduce((sum, booking) => sum + Number(booking.stay_subtotal ?? 0), 0))}</p></CardContent></Card>
                <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Pending Commission</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(commissions.filter((commission) => commission.status !== "paid").reduce((sum, commission) => sum + Number(commission.commission_amount ?? 0), 0))}</p></CardContent></Card>
                <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Stripe Status</p><div className="mt-3"><StatusBadge status={affiliate.stripe_connected ? "Connected" : "Needs Stripe"} /></div></CardContent></Card>
              </div>
            </div>
          )}
          <Card>
            <CardHeader><CardTitle>Affiliate Bookings</CardTitle></CardHeader>
            <CardContent className="p-0">
              {bookings.length === 0 ? (
                <div className="p-8 text-sm text-slate-500">No bookings attributed to this affiliate yet.</div>
              ) : (
                <Table>
                  <THead><TR><TH>Lodgify Booking ID</TH><TH>Stay Dates</TH><TH>Stay Subtotal</TH><TH>Total Paid</TH><TH>Status</TH></TR></THead>
                  <TBody>
                    {bookings.map((booking) => (
                      <TR key={booking.id}>
                        <TD>{booking.lodgify_booking_id}</TD>
                        <TD>{formatDate(booking.arrival)} - {formatDate(booking.departure)}</TD>
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
      )}
    </AppShell>
  );
}
