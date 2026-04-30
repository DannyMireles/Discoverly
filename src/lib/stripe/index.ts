import Stripe from "stripe";
import { requiredEnv } from "@/lib/supabase/server";

export function createStripeClient() {
  return new Stripe(requiredEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2025-08-27.basil",
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
}: {
  amount: number;
  currency: string;
  destination: string;
  idempotencyKey: string;
}) {
  const stripe = createStripeClient();
  return stripe.transfers.create(
    {
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      destination,
    },
    { idempotencyKey },
  );
}
