import { AppShell } from "@/components/layout/app-shell";
import { StripeSettingsPanel } from "@/components/company/stripe-settings-panel";

export default function StripeSettingsPage() {
  return (
    <AppShell title="Stripe Settings" description="Connect setup for affiliate payouts.">
      <StripeSettingsPanel />
    </AppShell>
  );
}
