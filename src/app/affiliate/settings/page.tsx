import { AppShell } from "@/components/layout/app-shell";
import { AffiliateStripeConnectBanner } from "@/components/affiliate/stripe-connect-banner";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAffiliateData } from "@/lib/company/data";
import { LogOut } from "lucide-react";

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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-blue-600" aria-hidden />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              Sign out of this browser session and return to the authentication screen.
            </p>
            <SignOutButton />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
