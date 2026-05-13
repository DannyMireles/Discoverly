import { AppShell } from "@/components/layout/app-shell";
import { AffiliateStripeConnectBanner } from "@/components/affiliate/stripe-connect-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAffiliateData } from "@/lib/company/data";

export default async function AffiliateSettingsPage() {
  const data = await getAffiliateData();

  return (
    <AppShell title="Affiliate Settings" description="Account profile and Stripe connection." section="affiliate">
      <div className="space-y-6">
        {data.affiliate && !data.affiliate.stripe_connected ? (
          <AffiliateStripeConnectBanner
            affiliateId={data.affiliate.id}
            email={data.affiliate.email}
            returnPath="/affiliate/settings"
          />
        ) : null}
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div><label className="text-sm font-medium text-slate-700">Name</label><Input defaultValue={data.affiliate?.name ?? ""} readOnly /></div>
            <div><label className="text-sm font-medium text-slate-700">Email</label><Input defaultValue={data.affiliate?.email ?? data.user?.email ?? ""} readOnly /></div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
