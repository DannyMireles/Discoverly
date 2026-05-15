import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { StripeSettingsPanel } from "@/components/company/stripe-settings-panel";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { getCurrentUserAndCompany } from "@/lib/company/current";

export default async function StripeSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string; incomplete?: string }>;
}) {
  const { user, company, configured } = await getCurrentUserAndCompany();
  const params = await searchParams;

  if (!configured) {
    return (
      <AppShell title="Stripe Settings" description="Connect your Stripe account to fund affiliate payouts.">
        <Banner title="Supabase is not configured" tone="warning">
          Add environment variables and restart the dev server.
        </Banner>
      </AppShell>
    );
  }

  if (!user) {
    redirect("/auth?redirectTo=/company/settings/stripe");
  }

  if (!company) {
    return (
      <AppShell title="Stripe Settings" description="Connect your Stripe account to fund affiliate payouts.">
        <Banner title="Company onboarding required" tone="warning" action={<Link href="/company/onboarding"><Button>Start Onboarding</Button></Link>}>
          Complete company onboarding before connecting Stripe.
        </Banner>
      </AppShell>
    );
  }

  return (
    <AppShell title="Stripe Settings" description="Step 3 of 4 — connect Stripe to enable affiliate payouts.">
      <div className="space-y-4">
        {params.connected === "true" && (
          <Banner title="Stripe connected successfully." tone="success">
            Your Stripe account is now linked. Payouts will transfer from your Stripe balance.
          </Banner>
        )}
        {params.incomplete === "true" && (
          <Banner title="Stripe setup needs a few more details." tone="warning">
            Finish the remaining Stripe onboarding requirements before approving affiliate payouts.
          </Banner>
        )}
        {params.error && (
          <Banner title="Stripe connection failed." tone="warning">
            {decodeURIComponent(params.error)}
          </Banner>
        )}
        <StripeSettingsPanel company={company} />
      </div>
    </AppShell>
  );
}
