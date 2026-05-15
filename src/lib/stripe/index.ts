import Stripe from "stripe";
import { requiredEnv } from "@/lib/supabase/server";

const STRIPE_API_VERSION = "2025-08-27.basil" as const;

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

export async function createAffiliateConnectAccount(email: string) {
  const stripe = createStripeClient();
  return stripe.accounts.create({
    type: "express",
    email,
    capabilities: {
      transfers: { requested: true },
    },
  });
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

export async function sendAffiliateTransfer({
  amount,
  currency,
  destination,
  idempotencyKey,
  sourceAccountId,
}: {
  amount: number;
  currency: string;
  destination: string;
  idempotencyKey: string;
  sourceAccountId: string;
}) {
  const stripe = createStripeClient();

  return stripe.transfers.create(
    {
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      destination,
    },
    { idempotencyKey, stripeAccount: sourceAccountId },
  );
}
