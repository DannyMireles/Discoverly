import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { errorMetadata, logOperationalEvent } from "@/lib/ops/events";
import {
  createStripeClient,
  getPaymentIntentLatestChargeId,
} from "@/lib/stripe";
import {
  markPayoutFundingFailed,
  processFundedPayoutBatch,
} from "@/lib/payouts/transfers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requiredEnv } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const stripe = createStripeClient();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    await logOperationalEvent({
      source: "stripe_webhook",
      event: "webhook_missing_signature",
      level: "warn",
      message: "Stripe webhook request was missing its signature header.",
    });
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      requiredEnv("STRIPE_WEBHOOK_SECRET"),
    );
  } catch (error) {
    await logOperationalEvent({
      source: "stripe_webhook",
      event: "webhook_invalid_signature",
      level: "warn",
      message: "Stripe webhook signature verification failed.",
      metadata: errorMetadata(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid Stripe webhook." },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "account.updated":
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await handlePayoutFundingSucceeded(event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.async_payment_failed":
        await handlePayoutFundingFailed(event.data.object as Stripe.Checkout.Session);
        break;
      case "transfer.reversed":
      case "transfer.updated":
        await handleTransferReversed(event.data.object as Stripe.Transfer);
        break;
      default:
        break;
    }

    await logOperationalEvent({
      source: "stripe_webhook",
      event: "webhook_received",
      message: "Stripe webhook processed.",
      metadata: {
        stripeEventId: event.id,
        type: event.type,
      },
    });

    return NextResponse.json({ received: true, type: event.type });
  } catch (error) {
    await logOperationalEvent({
      source: "stripe_webhook",
      event: "webhook_failed",
      level: "error",
      message: "Stripe webhook handler failed.",
      metadata: {
        stripeEventId: event.id,
        type: event.type,
        ...errorMetadata(error),
      },
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe webhook handler failed." },
      { status: 500 },
    );
  }
}

async function handlePayoutFundingSucceeded(session: Stripe.Checkout.Session) {
  if (session.metadata?.purpose !== "affiliate_payout_funding") return;

  const batchId = session.metadata.payoutBatchId;
  if (!batchId) throw new Error("Payout funding checkout session is missing payoutBatchId metadata.");

  if (session.payment_status !== "paid") {
    await logOperationalEvent({
      companyId: session.metadata.companyId ?? null,
      payoutBatchId: batchId,
      source: "stripe_webhook",
      event: "batch_funding_checkout_pending",
      level: "info",
      message: "Payout funding checkout completed before payment was paid.",
      metadata: {
        checkoutSessionId: session.id,
        paymentStatus: session.payment_status,
      },
    });
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!paymentIntentId) {
    throw new Error("Payout funding checkout session is missing payment_intent.");
  }

  const chargeId = await getPaymentIntentLatestChargeId(paymentIntentId);
  if (!chargeId) {
    throw new Error("Payout funding payment intent is missing latest_charge.");
  }

  await processFundedPayoutBatch({
    batchId,
    checkoutSessionId: session.id,
    paymentIntentId,
    chargeId,
  });
}

async function handlePayoutFundingFailed(session: Stripe.Checkout.Session) {
  if (session.metadata?.purpose !== "affiliate_payout_funding") return;

  const batchId = session.metadata.payoutBatchId;
  if (!batchId) throw new Error("Payout funding checkout session is missing payoutBatchId metadata.");

    await markPayoutFundingFailed({
      batchId,
      checkoutSessionId: session.id,
      message: "Stripe payment was not completed.",
    });
}

async function handleAccountUpdated(account: Stripe.Account) {
  const admin = createSupabaseAdminClient();
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const fullyOnboarded =
    Boolean(account.details_submitted) &&
    payoutsEnabled &&
    Boolean(account.charges_enabled ?? true);

  const { data: affiliate, error: affiliateLookupError } = await admin
    .from("affiliates")
    .select("id, company_id")
    .eq("stripe_account_id", account.id)
    .maybeSingle();

  if (affiliateLookupError) throw new Error(affiliateLookupError.message);

  if (affiliate) {
    const { error } = await admin
      .from("affiliates")
      .update({
        stripe_connected: fullyOnboarded,
        stripe_payouts_enabled: payoutsEnabled,
      })
      .eq("stripe_account_id", account.id);

    if (error) throw new Error(error.message);

    await logOperationalEvent({
      companyId: (affiliate.company_id as string | undefined) ?? null,
      affiliateId: (affiliate.id as string | undefined) ?? null,
      source: "stripe_webhook",
      event: "account_updated",
      message: "Affiliate Stripe account status updated from webhook.",
      metadata: {
        stripeAccountId: account.id,
        payoutsEnabled,
        fullyOnboarded,
      },
    });
  }

  const { data: company, error: companyLookupError } = await admin
    .from("companies")
    .select("id")
    .eq("stripe_account_id", account.id)
    .maybeSingle();

  if (companyLookupError) throw new Error(companyLookupError.message);

  if (company) {
    const { error } = await admin
      .from("companies")
      .update({
        stripe_connected: fullyOnboarded,
        stripe_access_token_encrypted: null,
      })
      .eq("stripe_account_id", account.id);

    if (error) throw new Error(error.message);

    await logOperationalEvent({
      companyId: (company.id as string | undefined) ?? null,
      source: "stripe_webhook",
      event: "company_account_updated",
      message: "Company Stripe account status updated from webhook.",
      metadata: {
        stripeAccountId: account.id,
        payoutsEnabled,
        fullyOnboarded,
      },
    });
  }

  if (!affiliate && !company) {
    await logOperationalEvent({
      source: "stripe_webhook",
      event: "account_updated_unmatched",
      level: "warn",
      message: "Stripe account.updated webhook did not match a known affiliate or company account.",
      metadata: {
        stripeAccountId: account.id,
        payoutsEnabled,
        fullyOnboarded,
      },
    });
  }
}

async function handleTransferReversed(transfer: Stripe.Transfer) {
  if (!transfer.reversed && transfer.amount_reversed === 0) return;

  const admin = createSupabaseAdminClient();

  const { data: payout } = await admin
    .from("payouts")
    .select("id, company_id, affiliate_id, payout_batch_id")
    .eq("stripe_transfer_id", transfer.id)
    .maybeSingle();

  if (!payout) return;

  await admin
    .from("payouts")
    .update({
      status: "failed",
      error_message: `Stripe transfer ${transfer.id} was reversed.`,
    })
    .eq("id", payout.id);

  const { data: items } = await admin
    .from("payout_items")
    .select("commission_id")
    .eq("payout_id", payout.id);

  const commissionIds = (items ?? []).map((item) => item.commission_id);
  if (commissionIds.length > 0) {
    await admin
      .from("commissions")
      .update({ status: "clawback_needed" })
      .in("id", commissionIds);
  }

  await logOperationalEvent({
    companyId: payout.company_id as string,
    affiliateId: payout.affiliate_id as string,
    payoutBatchId: payout.payout_batch_id as string,
    payoutId: payout.id as string,
    source: "stripe_webhook",
    event: "transfer_reversed",
    level: "error",
    message: "Stripe transfer was reversed and commissions were marked for clawback.",
    metadata: {
      stripeTransferId: transfer.id,
      commissionCount: commissionIds.length,
      amountReversed: transfer.amount_reversed,
    },
  });
}
