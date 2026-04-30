import Link from "next/link";
import { ArrowRight, CreditCard, TicketPercent, UserCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { SetupChecklist } from "@/components/company/setup-checklist";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AffiliateOnboardingPage() {
  return (
    <AppShell title="Affiliate Onboarding" description="Accept invite, see code, connect Stripe." section="affiliate">
      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <SetupChecklist
          title="Affiliate Setup"
          items={[
            { label: "Accept invite and create account", done: true },
            { label: "See code", done: true },
            { label: "Connect Stripe to get paid" },
          ]}
        />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: "Invite Accepted", icon: UserCheck, body: "Jane is linked to Zenful Cove.", action: "Done" },
            { title: "Code Ready", icon: TicketPercent, body: "Share JANE10 for 10% off a stay.", action: "View Code" },
            { title: "Stripe Needed", icon: CreditCard, body: "Payouts are paused until Stripe is connected.", action: "Connect Stripe" },
          ].map((step) => (
            <Card key={step.title}>
              <CardHeader><CardTitle className="flex items-center gap-2"><step.icon className="h-5 w-5 text-blue-600" aria-hidden />{step.title}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">{step.body}</p>
                <Button variant={step.action === "Done" ? "secondary" : "primary"}>
                  {step.action}
                  {step.action !== "Done" ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <Link href="/affiliate/dashboard" className="xl:col-start-2">
          <Button>Go to Dashboard</Button>
        </Link>
      </div>
    </AppShell>
  );
}
