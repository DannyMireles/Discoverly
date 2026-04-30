import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CompanyOnboardingForm } from "@/components/company/company-onboarding-form";
import { SetupChecklist } from "@/components/company/setup-checklist";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUserAndCompany } from "@/lib/company/current";

export default async function CompanyOnboardingPage() {
  const { user, company, configured } = await getCurrentUserAndCompany();

  return (
    <AppShell title="Company Onboarding" description="Set up Zenful Cove for affiliate-attributed direct bookings.">
      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <SetupChecklist
          items={[
            { label: "Create company", done: Boolean(company) },
            { label: "Connect Lodgify API key", done: company?.lodgify_connected },
            { label: "Test Lodgify connection and sync properties" },
            { label: "Connect Stripe for payouts", done: company?.stripe_connected },
            { label: "Create first affiliate" },
          ]}
        />
        <div className="space-y-6">
          {!configured ? (
            <Banner title="Supabase is not configured" tone="warning">
              Add Supabase environment variables, restart the dev server, then return here.
            </Banner>
          ) : null}
          {configured && !user ? (
            <Banner title="Create your admin account first" tone="warning" action={<Link href="/auth"><Button>Go to Auth</Button></Link>}>
              Company onboarding is tied to the signed-in Supabase user.
            </Banner>
          ) : null}
          {user ? <CompanyOnboardingForm /> : null}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Create First Affiliate</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">Create Jane, copy the exact Lodgify promotion name, and send the invite after Lodgify setup is confirmed.</p>
              <Link href="/company/affiliates/new">
                <Button>
                  New Affiliate
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
