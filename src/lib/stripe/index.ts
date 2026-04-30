import Stripe from "stripe";
import { requiredEnv } from "@/lib/supabase/server";

const STRIPE_API_VERSION = "2025-08-27.basil" as const;

/** Platform Stripe client — used for Connect OAuth and creating affiliate Express accounts. */
export function createStripeClient() {
  return new Stripe(requiredEnv("STRIPE_SECRET_KEY"), {
    apiVersion: STRIPE_API_VERSION,
  });
}

/** Company Stripe client — uses the company's OAuth access token to send transfers on their behalf. */
export function createCompanyStripeClient(accessToken: string) {
  return new Stripe(accessToken, {
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

export async function createAccountLink(accountId: string, refreshUrl: string, returnUrl: string) {
  const stripe = createStripeClient();
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
}

export async function getStripeConnectOAuthUrl(companyId: string) {
  const clientId = requiredEnv("STRIPE_CLIENT_ID");
  const url = new URL("https://connect.stripe.com/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", "read_write");
  url.searchParams.set("state", companyId);
  return url.toString();
}

export async function exchangeStripeOAuthCode(code: string) {
  const stripe = createStripeClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (stripe as any).oauth.token({ grant_type: "authorization_code", code }) as Promise<{
    access_token: string;
    stripe_user_id: string;
    token_type: string;
  }>;
}

export async function sendAffiliateTransfer({
  amount,
  currency,
  destination,
  idempotencyKey,
  companyAccessToken,
}: {
  amount: number;
  currency: string;
  destination: string;
  idempotencyKey: string;
  companyAccessToken?: string;
}) {
  const stripe = companyAccessToken
    ? createCompanyStripeClient(companyAccessToken)
    : createStripeClient();

  return stripe.transfers.create(
    {
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      destination,
    },
    { idempotencyKey },
  );
}
