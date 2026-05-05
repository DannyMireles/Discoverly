import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createStripeClient } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requiredEnv } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const stripe = createStripeClient();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
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
      case "transfer.reversed":
      case "transfer.updated":
        await handleTransferReversed(event.data.object as Stripe.Transfer);
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true, type: event.type });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe webhook handler failed." },
      { status: 500 },
    );
  }
}

async function handleAccountUpdated(account: Stripe.Account) {
  const admin = createSupabaseAdminClient();
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const fullyOnboarded =
    Boolean(account.details_submitted) &&
    payoutsEnabled &&
    Boolean(account.charges_enabled ?? true);

  await admin
    .from("affiliates")
    .update({
      stripe_connected: fullyOnboarded,
      stripe_payouts_enabled: payoutsEnabled,
    })
    .eq("stripe_account_id", account.id);
}

async function handleTransferReversed(transfer: Stripe.Transfer) {
  if (!transfer.reversed && transfer.amount_reversed === 0) return;

  const admin = createSupabaseAdminClient();

  const { data: payout } = await admin
    .from("payouts")
    .select("id, payout_batch_id")
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
}
