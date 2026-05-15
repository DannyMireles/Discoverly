import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { CompanyOnboardingForm } from "@/components/company/company-onboarding-form";
import { SetupChecklist } from "@/components/company/setup-checklist";
import { Banner } from "@/components/ui/banner";
import { getCurrentUserAndCompany } from "@/lib/company/current";

export default async function CompanyOnboardingPage() {
  const { user, company, configured } = await getCurrentUserAndCompany();

  if (!configured) {
    return (
      <AppShell title="Company Onboarding" description="Set up Zenful Cove for affiliate-attributed direct bookings.">
        <Banner title="Supabase is not configured" tone="warning">
          Add Supabase environment variables, restart the dev server, then return here.
        </Banner>
      </AppShell>
    );
  }

  if (!user) {
    redirect("/auth?redirectTo=/company/onboarding");
  }

  return (
    <AppShell title="Company Onboarding" description="Set up Zenful Cove for affiliate-attributed direct bookings.">
      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <SetupChecklist
          items={[
            { label: "Step 1: Create company", done: Boolean(company) },
            { label: "Step 2: Connect Lodgify API key", done: company?.lodgify_connected },
            { label: "Step 3: Stripe payout funding ready", done: Boolean(company) },
            { label: "Step 4: Create first affiliate" },
          ]}
        />
        <div className="space-y-6">
          <CompanyOnboardingForm />
        </div>
      </div>
    </AppShell>
  );
}
