import { AppShell } from "@/components/layout/app-shell";
import { Banner } from "@/components/ui/banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResendInviteButton } from "@/components/company/resend-invite-button";
import { AffiliateEditPanel } from "@/components/company/affiliate-edit-panel";
import { RotatePromotionPanel } from "@/components/company/rotate-promotion-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getCompanyData } from "@/lib/company/data";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export default async function AffiliateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCompanyData();
  const affiliate = data.affiliates.find((item) => item.id === id);
  const affiliatePromotions = data.promotions.filter((item) => item.affiliate_id === id);
  const promotion =
    affiliatePromotions.find((item) => ["active", "draft", "paused"].includes(item.status as string)) ??
    affiliatePromotions[0];
  const historicalPromotions = affiliatePromotions.filter((item) => item.id !== promotion?.id);
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
            <>
              <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                <Card>
                  <CardHeader><CardTitle>Promotion Setup</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <RotatePromotionPanel
                      affiliateId={affiliate.id}
                      currentPublicCode={promotion.public_code}
                      currentLodgifyPromotionName={promotion.lodgify_promotion_name}
                    />
                    <ResendInviteButton
                      affiliateId={affiliate.id}
                      alreadyAccepted={Boolean(affiliate.invite_accepted_at)}
                    />
                  </CardContent>
                </Card>
                <div className="grid gap-4 md:grid-cols-4">
                  <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Paid Bookings Driven</p><p className="mt-2 text-2xl font-semibold">{bookings.filter((booking) => booking.is_fully_paid && booking.is_affiliate_matched).length}</p></CardContent></Card>
                  <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Revenue Driven</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(bookings.reduce((sum, booking) => sum + Number(booking.stay_subtotal ?? 0), 0))}</p></CardContent></Card>
                  <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Pending Commission</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(commissions.filter((commission) => commission.status !== "paid").reduce((sum, commission) => sum + Number(commission.commission_amount ?? 0), 0))}</p></CardContent></Card>
                  <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Stripe Status</p><div className="mt-3"><StatusBadge status={affiliate.stripe_connected ? "Connected" : "Needs Stripe"} /></div></CardContent></Card>
                </div>
              </div>
              <AffiliateEditPanel
                affiliate={{
                  id: affiliate.id,
                  name: affiliate.name,
                  email: affiliate.email,
                  status: affiliate.status,
                }}
                promotion={{
                  guest_discount_type: promotion.guest_discount_type,
                  guest_discount_value: promotion.guest_discount_value,
                  affiliate_payout_type: promotion.affiliate_payout_type,
                  affiliate_payout_value: promotion.affiliate_payout_value,
                  affiliate_payout_base: promotion.affiliate_payout_base,
                  status: promotion.status,
                  internal_notes: promotion.internal_notes,
                }}
              />
              {historicalPromotions.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Previous promotion codes</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <THead>
                        <TR><TH>Public Code</TH><TH>Lodgify Promotion Name</TH><TH>Status</TH><TH>Expired</TH></TR>
                      </THead>
                      <TBody>
                        {historicalPromotions.map((past) => (
                          <TR key={past.id}>
                            <TD>{past.public_code}</TD>
                            <TD className="font-mono text-xs">{past.lodgify_promotion_name}</TD>
                            <TD><StatusBadge status={past.status} /></TD>
                            <TD>{past.expires_at ? formatDate(past.expires_at) : "—"}</TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : null}
            </>
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
