import { Banner } from "@/components/ui/banner";
import { ConnectStripeButton } from "@/components/affiliate/connect-stripe-button";

export function AffiliateStripeConnectBanner({
  affiliateId,
  email,
  justAccepted = false,
  returnPath = "/affiliate/dashboard",
}: {
  affiliateId: string;
  email: string;
  justAccepted?: boolean;
  returnPath?: string;
}) {
  return (
    <Banner
      title={justAccepted ? "Invite accepted. Your Stripe is not connected." : "Your Stripe is not connected."}
      tone="warning"
      action={<ConnectStripeButton affiliateId={affiliateId} email={email} returnPath={returnPath} />}
    >
      Click Connect Stripe to finish payout setup. Earnings can accrue now, but payouts stay paused until Stripe is
      connected.
    </Banner>
  );
}
