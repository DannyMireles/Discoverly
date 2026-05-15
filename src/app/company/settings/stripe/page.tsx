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
      <AppShell title="Stripe Settings" description="Configure affiliate payout funding.">
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
      <AppShell title="Stripe Settings" description="Configure affiliate payout funding.">
        <Banner title="Company onboarding required" tone="warning" action={<Link href="/company/onboarding"><Button>Start Onboarding</Button></Link>}>
          Complete company onboarding before connecting Stripe.
        </Banner>
      </AppShell>
    );
  }

  return (
    <AppShell title="Stripe Settings" description="Fund payout batches through Stripe Checkout.">
      <div className="space-y-4">
        {params.connected === "true" && (
          <Banner title="Stripe connected successfully." tone="success">
            This legacy connection is no longer required for payout funding.
          </Banner>
        )}
        {params.incomplete === "true" && (
          <Banner title="Stripe setup needs a few more details." tone="warning">
            Company Stripe onboarding is no longer required. Use the Payouts page to fund payout batches.
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
