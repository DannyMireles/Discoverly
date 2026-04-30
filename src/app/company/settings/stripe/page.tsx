import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { StripeSettingsPanel } from "@/components/company/stripe-settings-panel";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { getCurrentUserAndCompany } from "@/lib/company/current";

export default async function StripeSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { user, company, configured } = await getCurrentUserAndCompany();
  const params = await searchParams;

  return (
    <AppShell title="Stripe Settings" description="Connect your Stripe account to fund affiliate payouts.">
      {!configured ? (
        <Banner title="Supabase is not configured" tone="warning">
          Add environment variables and restart the dev server.
        </Banner>
      ) : !user ? (
        <Banner title="Sign in required" tone="warning" action={<Link href="/auth"><Button>Go to Auth</Button></Link>}>
          Stripe setup is tied to your account.
        </Banner>
      ) : !company ? (
        <Banner title="Company onboarding required" tone="warning" action={<Link href="/company/onboarding"><Button>Start Onboarding</Button></Link>}>
          Complete company onboarding before connecting Stripe.
        </Banner>
      ) : (
        <div className="space-y-4">
          {params.connected === "true" && (
            <Banner title="Stripe connected successfully." tone="success">
              Your Stripe account is now linked. Payouts will transfer from your Stripe balance.
            </Banner>
          )}
          {params.error && (
            <Banner title="Stripe connection failed." tone="warning">
              {decodeURIComponent(params.error)}
            </Banner>
          )}
          <StripeSettingsPanel company={company} />
        </div>
      )}
    </AppShell>
  );
}
