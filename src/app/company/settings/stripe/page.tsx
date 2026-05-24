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
        <Banner title="Account services are temporarily unavailable" tone="warning">
          Please try again shortly or contact support if this continues.
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
        <Banner title="Company setup needed" tone="warning" action={<Link href="/company/onboarding"><Button>Start Setup</Button></Link>}>
          Complete company setup before managing payout settings.
        </Banner>
      </AppShell>
    );
  }

  return (
    <AppShell title="Stripe Settings" description="Manage secure payout funding through Stripe.">
      <div className="space-y-4">
        {params.connected === "true" && (
          <Banner title="Stripe setup is complete." tone="success">
            You can now review and fund payout batches from the Payouts page.
          </Banner>
        )}
        {params.incomplete === "true" && (
          <Banner title="Stripe setup needs a few more details." tone="warning">
            Return to the Payouts page when you are ready to fund a batch.
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
