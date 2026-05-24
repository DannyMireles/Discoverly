import Link from "next/link";
import { ArrowRight, CreditCard, TicketPercent, UserCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { SetupChecklist } from "@/components/company/setup-checklist";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectStripeButton } from "@/components/affiliate/connect-stripe-button";
import { AffiliateStripeConnectBanner } from "@/components/affiliate/stripe-connect-banner";
import { getAffiliateData } from "@/lib/company/data";

export default async function AffiliateOnboardingPage() {
  const data = await getAffiliateData();
  const affiliate = data.affiliate;
  const promotion = data.promotion;
  const stripeConnected = Boolean(affiliate?.stripe_connected);
  const inviteAccepted = Boolean(affiliate?.invite_accepted_at);

  return (
    <AppShell
      title="Affiliate Setup"
      description="Accept invite, see code, connect Stripe."
      section="affiliate"
    >
      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <SetupChecklist
          title="Affiliate Setup"
          items={[
            { label: "Accept invite and create account", done: inviteAccepted },
            { label: "See code", done: Boolean(promotion?.public_code) },
            { label: "Connect Stripe to get paid", done: stripeConnected },
          ]}
        />
        <div className="space-y-4">
          {!affiliate ? (
            <Banner title="Affiliate account not connected yet" tone="warning">
              Open your invite link to finish connecting your affiliate account.
            </Banner>
          ) : null}
          {affiliate && !stripeConnected ? (
            <AffiliateStripeConnectBanner
              affiliateId={affiliate.id}
              email={affiliate.email}
              justAccepted={inviteAccepted}
              returnPath="/affiliate/onboarding"
            />
          ) : null}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-blue-600" aria-hidden />
                  Invite Accepted
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">
                  {inviteAccepted
                    ? `${affiliate?.name ?? "Your"} account is linked.`
                    : "Open your invite link to claim your account."}
                </p>
                <Button variant="secondary" disabled>
                  {inviteAccepted ? "Done" : "Pending"}
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TicketPercent className="h-5 w-5 text-blue-600" aria-hidden />
                  Code Ready
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">
                  {promotion?.public_code
                    ? `Share ${promotion.public_code} for ${promotion.guest_discount_value}% off a stay.`
                    : "Code will appear here once your invite is accepted."}
                </p>
                <Link href="/affiliate/code">
                  <Button variant="secondary">View Code</Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-600" aria-hidden />
                  {stripeConnected ? "Stripe Connected" : "Stripe Needed"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">
                  {stripeConnected
                    ? "Payouts are enabled. You can keep an eye on them under Payouts."
                    : "Payouts are paused until Stripe is connected."}
                </p>
                {stripeConnected ? (
                  <Button variant="secondary" disabled>
                    Connected
                  </Button>
                ) : affiliate ? (
                  <ConnectStripeButton affiliateId={affiliate.id} email={affiliate.email} />
                ) : (
                  <Button variant="secondary" disabled>
                    Pending
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
          <Link href="/affiliate/dashboard">
            <Button>
              Go to Dashboard
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
