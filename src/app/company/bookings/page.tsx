import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getCompanyData } from "@/lib/company/data";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export default async function BookingsPage() {
  const data = await getCompanyData();

  return (
    <AppShell title="Bookings" description="Synced Lodgify bookings with strict paid and matched attribution." actions={<Button>Run Sync Now</Button>}>
      <Card>
        <CardHeader><CardTitle>Synced Lodgify Bookings</CardTitle></CardHeader>
        <CardContent className="p-0">
          {data.bookings.length === 0 ? (
            <div className="p-8 text-sm text-slate-500">No synced Lodgify bookings yet.</div>
          ) : (
            <Table>
              <THead><TR><TH>Lodgify Booking ID</TH><TH>Guest Name</TH><TH>Property</TH><TH>Arrival</TH><TH>Departure</TH><TH>Amount Paid</TH><TH>Total</TH><TH>Promotion</TH><TH>Matched</TH></TR></THead>
              <TBody>
                {data.bookings.map((booking) => (
                  <TR key={booking.id}>
                    <TD>{booking.lodgify_booking_id}</TD>
                    <TD>{booking.guest_name ?? "Guest"}</TD>
                    <TD>{booking.property_id ?? "Not mapped"}</TD>
                    <TD>{formatDate(booking.arrival)}</TD>
                    <TD>{formatDate(booking.departure)}</TD>
                    <TD>{formatCurrency(Number(booking.amount_paid ?? 0))}</TD>
                    <TD>{formatCurrency(Number(booking.total_amount ?? 0))}</TD>
                    <TD className="font-mono text-xs">{booking.promotion_description ?? "None"}</TD>
                    <TD><StatusBadge status={booking.is_affiliate_matched ? "matched" : "unmatched"} /></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
