import { AppShell } from "@/components/layout/app-shell";
import { CompanySettingsForm } from "@/components/company/company-settings-form";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { getCurrentUserAndCompany } from "@/lib/company/current";
import Link from "next/link";

export default async function CompanySettingsPage() {
  const { user, company, configured } = await getCurrentUserAndCompany();

  return (
    <AppShell title="Company Settings" description="Company defaults, Lodgify connection, and Stripe payout setup.">
      {!configured ? (
        <Banner title="Settings are temporarily unavailable" tone="warning">
          Please try again shortly or contact support if this continues.
        </Banner>
      ) : !user ? (
        <Banner title="Sign in required" tone="warning" action={<Link href="/auth"><Button>Sign In</Button></Link>}>
          Sign in before editing company settings.
        </Banner>
      ) : !company ? (
        <Banner title="Company setup needed" tone="warning" action={<Link href="/company/onboarding"><Button>Start Setup</Button></Link>}>
          Complete company setup before editing settings.
        </Banner>
      ) : (
        <CompanySettingsForm company={company} />
      )}
    </AppShell>
  );
}
