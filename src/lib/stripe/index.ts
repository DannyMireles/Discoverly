import Stripe from "stripe";
import { requiredEnv } from "@/lib/supabase/server";

const STRIPE_API_VERSION = "2025-08-27.basil" as const;

type AffiliateCapability = "transfers" | "card_payments";

export type AffiliateStripeAccountOverview = {
  id: string;
  email: string | null;
  type: Stripe.Account.Type;
  country: string | null;
  defaultCurrency: string | null;
  businessType: Stripe.Account.BusinessType | null;
  createdAt: string | null;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  capabilities: Record<AffiliateCapability, string>;
  disabledReason: string | null;
  currentDeadline: string | null;
  currentlyDue: string[];
  pastDue: string[];
  eventuallyDue: string[];
  pendingVerification: string[];
  requirementErrors: string[];
  payoutSchedule: {
    interval: string | null;
    delayDays: number | null;
    monthlyPayoutDays: number[];
    weeklyPayoutDays: string[];
  };
  payoutDestination: string | null;
  dashboardDisplayName: string | null;
};

/**
 * "live" only on Vercel production deploys; everything else (preview, local, staging) uses test keys.
 * Override with STRIPE_MODE=live|test if you need to force a mode.
 */
export function getStripeMode(): "test" | "live" {
  const override = process.env.STRIPE_MODE?.toLowerCase();
  if (override === "live" || override === "test") return override;
  return process.env.VERCEL_ENV === "production" ? "live" : "test";
}

function stripeSecretKey() {
  return requiredEnv(getStripeMode() === "live" ? "STRIPE_SECRET_KEY_LIVE" : "STRIPE_SECRET_KEY_TEST");
}

/** Platform Stripe client — used for Connect onboarding, webhooks, and transfers. */
export function createStripeClient() {
  return new Stripe(stripeSecretKey(), {
    apiVersion: STRIPE_API_VERSION,
  });
}

function affiliateAccountCountry() {
  return process.env.STRIPE_AFFILIATE_ACCOUNT_COUNTRY ?? "US";
}

export async function createAffiliateConnectAccount(email: string) {
  const stripe = createStripeClient();
  return stripe.accounts.create({
    type: "express",
    country: affiliateAccountCountry(),
    email,
    capabilities: {
      // US-to-US Express accounts must onboard under Stripe's full terms, which requires card_payments.
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
}

export function isAffiliateConnectAccountReady(account: Stripe.Account) {
  return (
    Boolean(account.details_submitted) &&
    Boolean(account.payouts_enabled) &&
    account.capabilities?.transfers === "active"
  );
}

export async function getAffiliateStripeAccountOverview(accountId: string): Promise<AffiliateStripeAccountOverview> {
  const stripe = createStripeClient();
  const account = await stripe.accounts.retrieve(accountId);
  const requirements = account.requirements;
  const payoutSchedule = account.settings?.payouts?.schedule;
  const payoutDestination = account.external_accounts?.data[0];

  return {
    id: account.id,
    email: account.email,
    type: account.type,
    country: account.country ?? null,
    defaultCurrency: account.default_currency ?? null,
    businessType: account.business_type ?? null,
    createdAt: account.created ? new Date(account.created * 1000).toISOString() : null,
    detailsSubmitted: Boolean(account.details_submitted),
    payoutsEnabled: Boolean(account.payouts_enabled),
    chargesEnabled: Boolean(account.charges_enabled),
    capabilities: {
      transfers: account.capabilities?.transfers ?? "unknown",
      card_payments: account.capabilities?.card_payments ?? "unknown",
    },
    disabledReason: requirements?.disabled_reason ?? null,
    currentDeadline: requirements?.current_deadline
      ? new Date(requirements.current_deadline * 1000).toISOString()
      : null,
    currentlyDue: requirements?.currently_due ?? [],
    pastDue: requirements?.past_due ?? [],
    eventuallyDue: requirements?.eventually_due ?? [],
    pendingVerification: requirements?.pending_verification ?? [],
    requirementErrors: requirements?.errors?.map((error) => error.reason) ?? [],
    payoutSchedule: {
      interval: payoutSchedule?.interval ?? null,
      delayDays: payoutSchedule?.delay_days ?? null,
      monthlyPayoutDays: payoutSchedule?.monthly_payout_days ?? [],
      weeklyPayoutDays: payoutSchedule?.weekly_payout_days ?? [],
    },
    payoutDestination: formatPayoutDestination(payoutDestination),
    dashboardDisplayName: account.settings?.dashboard?.display_name ?? null,
  };
}

export async function createExpressDashboardLoginLink(accountId: string) {
  const stripe = createStripeClient();
  return stripe.accounts.createLoginLink(accountId);
}

function formatPayoutDestination(destination: Stripe.ExternalAccount | undefined) {
  if (!destination) return null;

  if (destination.object === "bank_account") {
    const bankName = destination.bank_name ?? "Bank account";
    return `${bankName} ending in ${destination.last4}`;
  }

  const brand = destination.brand === "Unknown" ? "Debit card" : destination.brand;
  return `${brand} ending in ${destination.last4}`;
}

export async function createCompanyConnectAccount(email?: string | null, businessName?: string | null) {
  const stripe = createStripeClient();
  return stripe.accounts.create({
    type: "standard",
    email: email ?? undefined,
    business_profile: businessName ? { name: businessName } : undefined,
  });
}

export async function retrieveConnectAccount(accountId: string) {
  const stripe = createStripeClient();
  return stripe.accounts.retrieve(accountId);
}

export async function createAccountLink(accountId: string, refreshUrl: string, returnUrl: string) {
  const stripe = createStripeClient();
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
}

export async function createPayoutFundingCheckoutSession({
  batchId,
  companyId,
  companyName,
  customerEmail,
  amount,
  currency,
  successUrl,
  cancelUrl,
}: {
  batchId: string;
  companyId: string;
  companyName: string;
  customerEmail?: string | null;
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const stripe = createStripeClient();
  const cents = Math.round(amount * 100);
  const transferGroup = `payout_batch_${batchId}`;

  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: cents,
          product_data: {
            name: `${companyName} affiliate payout funding`,
            description: "Funds an approved Discoverly affiliate payout batch.",
          },
        },
      },
    ],
    metadata: {
      purpose: "affiliate_payout_funding",
      payoutBatchId: batchId,
      companyId,
    },
    payment_intent_data: {
      transfer_group: transferGroup,
      metadata: {
        purpose: "affiliate_payout_funding",
        payoutBatchId: batchId,
        companyId,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

export async function getPaymentIntentLatestChargeId(paymentIntentId: string) {
  const stripe = createStripeClient();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });
  const latestCharge = paymentIntent.latest_charge;

  if (!latestCharge) return null;
  return typeof latestCharge === "string" ? latestCharge : latestCharge.id;
}

export async function sendAffiliateTransfer({
  amount,
  currency,
  destination,
  idempotencyKey,
  sourceTransaction,
  transferGroup,
  metadata,
}: {
  amount: number;
  currency: string;
  destination: string;
  idempotencyKey: string;
  sourceTransaction?: string | null;
  transferGroup?: string | null;
  metadata?: Record<string, string>;
}) {
  const stripe = createStripeClient();

  return stripe.transfers.create(
    {
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      destination,
      source_transaction: sourceTransaction ?? undefined,
      transfer_group: transferGroup ?? undefined,
      metadata,
    },
    { idempotencyKey },
  );
}
