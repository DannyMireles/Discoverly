import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { LodgifySettingsForm } from "@/components/company/lodgify-settings-form";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { getCurrentUserAndCompany } from "@/lib/company/current";

export default async function LodgifySettingsPage() {
  const { user, company, configured } = await getCurrentUserAndCompany();

  if (!configured) {
    return (
      <AppShell title="Lodgify Settings" description="Connect Lodgify and sync booking data.">
        <Banner title="Lodgify settings are temporarily unavailable" tone="warning">
          Please try again shortly or contact support if this continues.
        </Banner>
      </AppShell>
    );
  }

  if (!user) {
    redirect("/auth?redirectTo=/company/settings/lodgify");
  }

  if (!company) {
    return (
      <AppShell title="Lodgify Settings" description="Connect Lodgify and sync booking data.">
        <Banner title="Company setup needed" tone="warning" action={<Link href="/company/onboarding"><Button>Start Setup</Button></Link>}>
          Complete company setup before saving Lodgify credentials.
        </Banner>
      </AppShell>
    );
  }

  return (
    <AppShell title="Lodgify Settings" description="Step 2 of 4 — connect Lodgify, then continue to Stripe.">
      <LodgifySettingsForm company={company} />
    </AppShell>
  );
}
