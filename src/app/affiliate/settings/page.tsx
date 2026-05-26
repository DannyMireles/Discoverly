import { AppShell } from "@/components/layout/app-shell";
import { AffiliateStripeAccountSettingsPanel } from "@/components/affiliate/stripe-account-settings-panel";
import { AffiliateStripeConnectBanner } from "@/components/affiliate/stripe-connect-banner";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Banner } from "@/components/ui/banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAffiliateData } from "@/lib/company/data";
import { getAffiliateStripeAccountOverview } from "@/lib/stripe";
import { LogOut } from "lucide-react";

export default async function AffiliateSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ stripe?: string; stripeDashboard?: string }>;
}) {
  const data = await getAffiliateData();
  const params = await searchParams;
  const stripeAccountId = (data.affiliate?.stripe_account_id as string | null | undefined) ?? null;
  const stripeAccountResult = stripeAccountId
    ? await getStripeAccountResult(stripeAccountId)
    : { account: null, error: null };

  return (
    <AppShell title="Affiliate Settings" description="Account profile and Stripe connection." section="affiliate">
      <div className="space-y-6">
        {params.stripe === "connected" ? (
          <Banner title="Stripe setup is complete." tone="success">
            Your payout account is connected and ready for approved affiliate commissions.
          </Banner>
        ) : null}
        {params.stripe === "incomplete" ? (
          <Banner title="Stripe needs a few more details." tone="warning">
            Open your Stripe Dashboard or continue setup to finish payout onboarding.
          </Banner>
        ) : null}
        {params.stripeDashboard === "missing" ? (
          <Banner title="Stripe is not connected yet." tone="warning">
            Connect Stripe before opening the Express Dashboard.
          </Banner>
        ) : null}
        {params.stripeDashboard === "error" ? (
          <Banner title="Stripe Dashboard could not be opened." tone="warning">
            Try again in a moment or continue setup if Stripe still needs account details.
          </Banner>
        ) : null}
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
        <AffiliateStripeAccountSettingsPanel
          affiliate={data.affiliate}
          account={stripeAccountResult.account}
          error={stripeAccountResult.error}
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-blue-600" aria-hidden />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              Sign out and return to the sign-in screen.
            </p>
            <SignOutButton />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

async function getStripeAccountResult(stripeAccountId: string) {
  try {
    return {
      account: await getAffiliateStripeAccountOverview(stripeAccountId),
      error: null,
    };
  } catch {
    return {
      account: null,
      error: "Stripe did not return account details for this request.",
    };
  }
}
