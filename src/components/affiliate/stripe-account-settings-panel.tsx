import Link from "next/link";
import { AlertCircle, ExternalLink, Landmark, ShieldCheck } from "lucide-react";
import { ConnectStripeButton } from "@/components/affiliate/connect-stripe-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AffiliateStripeAccountOverview } from "@/lib/stripe";
import { formatDate, formatOrdinalDay } from "@/lib/utils/format";

type AffiliateStripeAccountPanelProps = {
  affiliate:
    | {
        id: string;
        email: string;
        stripe_account_id?: string | null;
        stripe_connected?: boolean | null;
        stripe_payouts_enabled?: boolean | null;
      }
    | null;
  account: AffiliateStripeAccountOverview | null;
  error?: string | null;
};

export function AffiliateStripeAccountSettingsPanel({
  affiliate,
  account,
  error,
}: AffiliateStripeAccountPanelProps) {
  const hasStripeAccount = Boolean(affiliate?.stripe_account_id);
  const ready = Boolean(affiliate?.stripe_connected && affiliate?.stripe_payouts_enabled && account?.payoutsEnabled);
  const actionCount = account ? new Set([...account.currentlyDue, ...account.pastDue]).size : 0;
  const status = ready ? "Connected" : hasStripeAccount ? "Action needed" : "Not connected";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-blue-600" aria-hidden />
              Stripe Account
            </CardTitle>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Review payout readiness, Stripe requirements, and the account used for affiliate commissions.
            </p>
          </div>
          <Badge tone={ready ? "green" : hasStripeAccount ? "amber" : "slate"}>{status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!affiliate ? (
          <div className="rounded-xl border border-[#dbc888] bg-[#ecdfae]/60 p-4 text-sm text-[#665218]">
            Accept your invite before connecting Stripe.
          </div>
        ) : !hasStripeAccount ? (
          <div className="flex flex-col gap-4 rounded-xl border border-[#dbc888] bg-[#ecdfae]/60 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#665218]">Stripe is not connected yet.</p>
              <p className="mt-1 text-sm text-[#6e632f]">Connect Stripe to add payout details and unlock affiliate payouts.</p>
            </div>
            <ConnectStripeButton affiliateId={affiliate.id} email={affiliate.email} returnPath="/affiliate/settings" />
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 rounded-xl border border-[#d9aa9f] bg-[#ebccc4]/70 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#7e362c]" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-[#7e362c]">Stripe details could not be refreshed.</p>
              <p className="mt-1 text-sm text-[#7e362c]/80">{error}</p>
            </div>
          </div>
        ) : account ? (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <StatusTile
                label="Onboarding"
                value={account.detailsSubmitted ? "Submitted" : "Incomplete"}
                tone={account.detailsSubmitted ? "green" : "amber"}
              />
              <StatusTile
                label="Payouts"
                value={account.payoutsEnabled ? "Enabled" : "Paused"}
                tone={account.payoutsEnabled ? "green" : "amber"}
              />
              <StatusTile
                label="Action Items"
                value={actionCount > 0 ? String(actionCount) : "None"}
                tone={actionCount > 0 ? "amber" : "green"}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-white/60 bg-white/60 p-4">
                <h3 className="text-sm font-bold text-[#17151f]">Account Details</h3>
                <dl className="mt-3 space-y-3 text-sm">
                  <InfoRow label="Stripe account" value={account.id} />
                  <InfoRow label="Email" value={account.email ?? affiliate.email} />
                  <InfoRow label="Country" value={account.country ?? "Not set"} />
                  <InfoRow label="Currency" value={account.defaultCurrency?.toUpperCase() ?? "Not set"} />
                  <InfoRow label="Business type" value={humanize(account.businessType ?? "Not set")} />
                  <InfoRow label="Created" value={formatDate(account.createdAt)} />
                </dl>
              </div>

              <div className="rounded-xl border border-white/60 bg-white/60 p-4">
                <h3 className="text-sm font-bold text-[#17151f]">Payout Details</h3>
                <dl className="mt-3 space-y-3 text-sm">
                  <InfoRow label="Destination" value={account.payoutDestination ?? "Not added yet"} />
                  <InfoRow label="Stripe payout schedule" value={formatPayoutSchedule(account)} />
                  <InfoRow label="Discoverly payout review" value="Monthly approved commission batches" />
                  <InfoRow label="Display name" value={account.dashboardDisplayName ?? "Not set"} />
                </dl>
              </div>
            </div>

            <div className="rounded-xl border border-white/60 bg-white/60 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-[#17151f]">Stripe Capabilities</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <CapabilityRow label="Transfers" status={account.capabilities.transfers} />
                    <CapabilityRow label="Card payments" status={account.capabilities.card_payments} />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-600">
                    Stripe requires card payments during US Express onboarding. Discoverly still uses this account for
                    affiliate commission transfers only.
                  </p>
                </div>
              </div>
            </div>

            <RequirementsSummary account={account} />

            <div className="flex flex-wrap gap-3">
              <Link
                href="/api/stripe/connect/affiliate/dashboard"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#635bff] px-6 text-sm font-bold text-white shadow-[0_14px_34px_rgba(99,91,255,0.28)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#5851eb] hover:shadow-[0_20px_44px_rgba(99,91,255,0.38)]"
              >
                Open Stripe Dashboard
                <ExternalLink className="h-4 w-4" aria-hidden />
              </Link>
              {!ready ? (
                <ConnectStripeButton
                  affiliateId={affiliate.id}
                  email={affiliate.email}
                  returnPath="/affiliate/settings"
                  variant="secondary"
                />
              ) : null}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatusTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "amber" | "slate";
}) {
  return (
    <div className="rounded-xl border border-white/60 bg-white/60 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <div className="mt-3">
        <Badge tone={tone}>{value}</Badge>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 text-right font-semibold text-[#17151f] break-words">{value}</dd>
    </div>
  );
}

function CapabilityRow({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/70 bg-[#f8f8f1] px-3 py-2">
      <span className="text-sm font-semibold text-[#25251f]">{label}</span>
      <Badge tone={capabilityTone(status)}>{humanize(status)}</Badge>
    </div>
  );
}

function RequirementsSummary({ account }: { account: AffiliateStripeAccountOverview }) {
  const due = [...new Set([...account.pastDue, ...account.currentlyDue])];

  if (account.disabledReason || due.length > 0 || account.pendingVerification.length > 0 || account.requirementErrors.length > 0) {
    return (
      <div className="rounded-xl border border-[#dbc888] bg-[#ecdfae]/60 p-4">
        <h3 className="text-sm font-bold text-[#665218]">Stripe Requirements</h3>
        {account.disabledReason ? (
          <p className="mt-2 text-sm text-[#665218]">Disabled reason: {humanize(account.disabledReason)}</p>
        ) : null}
        {account.currentDeadline ? (
          <p className="mt-1 text-sm text-[#665218]">Due by {formatDate(account.currentDeadline)}.</p>
        ) : null}
        {due.length > 0 ? (
          <ul className="mt-3 grid gap-2 text-sm text-[#665218] md:grid-cols-2">
            {due.slice(0, 6).map((item) => (
              <li key={item} className="rounded-lg bg-white/50 px-3 py-2">
                {humanize(item)}
              </li>
            ))}
          </ul>
        ) : null}
        {account.pendingVerification.length > 0 ? (
          <p className="mt-3 text-sm text-[#665218]">
            {account.pendingVerification.length} item{account.pendingVerification.length === 1 ? "" : "s"} pending Stripe verification.
          </p>
        ) : null}
        {account.requirementErrors.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm text-[#7e362c]">
            {account.requirementErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#c8dbb8] bg-[#e8f2de]/80 p-4 text-sm text-[#2a5c30]">
      Stripe does not show any required account actions right now.
    </div>
  );
}

function formatPayoutSchedule(account: AffiliateStripeAccountOverview) {
  const schedule = account.payoutSchedule;
  if (!schedule.interval) return "Not set";

  if (schedule.interval === "manual") return "Manual";
  if (schedule.interval === "daily") return withDelay("Daily", schedule.delayDays);
  if (schedule.interval === "weekly" && schedule.weeklyPayoutDays.length > 0) {
    return withDelay(`Weekly on ${schedule.weeklyPayoutDays.map(humanize).join(", ")}`, schedule.delayDays);
  }
  if (schedule.interval === "monthly" && schedule.monthlyPayoutDays.length > 0) {
    return withDelay(
      `Monthly on ${schedule.monthlyPayoutDays.map((day) => formatOrdinalDay(day)).join(", ")}`,
      schedule.delayDays,
    );
  }

  return withDelay(humanize(schedule.interval), schedule.delayDays);
}

function withDelay(label: string, delayDays: number | null) {
  if (delayDays === null) return label;
  return `${label}, ${delayDays} day${delayDays === 1 ? "" : "s"} after funds are available`;
}

function capabilityTone(status: string) {
  if (status === "active") return "green";
  if (status === "pending") return "blue";
  if (status === "inactive") return "amber";
  return "slate";
}

function humanize(value: string) {
  return value
    .replaceAll(".", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
