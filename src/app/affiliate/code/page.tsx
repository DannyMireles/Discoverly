import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyField } from "@/components/ui/copy-field";
import { Banner } from "@/components/ui/banner";
import { getAffiliateData } from "@/lib/company/data";

export default async function AffiliateCodePage() {
  const data = await getAffiliateData();
  const message = data.promotion ? `Use my code ${data.promotion.public_code} for a discount at ${data.company?.name ?? "Zenful Cove"}.` : "";

  return (
    <AppShell title="Affiliate Code" description="Share your code for direct bookings." section="affiliate">
      {!data.promotion ? (
        <Banner title="No code yet" tone="warning">Accept your invite to see your affiliate code.</Banner>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <Card>
            <CardHeader><CardTitle>Promo Details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <CopyField label="Public code" value={data.promotion.public_code} />
              <CopyField label="Booking page" value={data.company?.booking_site_url ?? "Not configured"} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Promo Message</CardTitle></CardHeader>
            <CardContent><CopyField label="Copyable message" value={message} /></CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
