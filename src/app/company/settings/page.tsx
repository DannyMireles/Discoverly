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
        <Banner title="Supabase is not configured" tone="warning">
          Add `.env.local`, restart the dev server, then return here.
        </Banner>
      ) : !user ? (
        <Banner title="Sign in required" tone="warning" action={<Link href="/auth"><Button>Go to Auth</Button></Link>}>
          Settings are tied to your Supabase account.
        </Banner>
      ) : !company ? (
        <Banner title="Company onboarding required" tone="warning" action={<Link href="/company/onboarding"><Button>Start Onboarding</Button></Link>}>
          Create Zenful Cove before editing settings.
        </Banner>
      ) : (
        <CompanySettingsForm company={company} />
      )}
    </AppShell>
  );
}
