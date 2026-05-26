import { errorMetadata, logOperationalEvent } from "@/lib/ops/events";
import { getPaymentIntentLatestChargeId, sendAffiliateTransfer } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const PROCESSABLE_PAYOUT_STATUSES = ["pending", "approved", "failed"] as const;

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

export async function processPayoutTransfer({
  payoutId,
  actorUserId = null,
  sourceTransaction,
}: {
  payoutId: string;
  actorUserId?: string | null;
  sourceTransaction?: string | null;
}) {
  const admin = createSupabaseAdminClient();

  const { data: payout, error: payoutError } = await admin
    .from("payouts")
    .select("id, company_id, affiliate_id, payout_batch_id, amount, status, stripe_transfer_id")
    .eq("id", payoutId)
    .maybeSingle();

  if (payoutError) throw new Error(payoutError.message);
  if (!payout) throw new Error("Payout not found.");

  if (payout.status === "paid" && payout.stripe_transfer_id) {
    return {
      ok: true,
      payoutId: payout.id as string,
      stripeTransferId: payout.stripe_transfer_id as string,
      alreadyPaid: true,
    };
  }

  if (!PROCESSABLE_PAYOUT_STATUSES.includes(payout.status as (typeof PROCESSABLE_PAYOUT_STATUSES)[number])) {
    throw new Error(`Payout status ${payout.status} cannot be processed.`);
  }

  if (Number(payout.amount) <= 0) {
    throw new Error("Payout amount must be greater than zero.");
  }

  const { data: batch, error: batchError } = await admin
    .from("payout_batches")
    .select("id, funding_status, stripe_payment_charge_id, stripe_payment_intent_id")
    .eq("id", payout.payout_batch_id)
    .single();

  if (batchError) throw new Error(batchError.message);

  const transferSourceTransaction = await resolveTransferSourceTransaction({
    admin,
    payoutBatchId: payout.payout_batch_id as string,
    sourceTransaction,
    storedChargeId: batch.stripe_payment_charge_id as string | null,
    paymentIntentId: batch.stripe_payment_intent_id as string | null,
  });
  if (!transferSourceTransaction) {
    await logOperationalEvent({
      companyId: payout.company_id as string,
      payoutBatchId: payout.payout_batch_id as string,
      payoutId: payout.id as string,
      affiliateId: payout.affiliate_id as string,
      actorUserId,
      source: "payouts",
      event: "transfer_skipped_unfunded",
      level: "warn",
      message: "Payout batch was not funded before transfer processing.",
      metadata: {
        fundingStatus: batch.funding_status,
      },
    });
    throw new Error("Fund this payout batch before sending affiliate payouts.");
  }

  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("currency_code")
    .eq("id", payout.company_id)
    .single();

  if (companyError) throw new Error(companyError.message);

  const { data: affiliate, error: affiliateError } = await admin
    .from("affiliates")
    .select("id, stripe_account_id, stripe_connected, stripe_payouts_enabled")
    .eq("id", payout.affiliate_id)
    .maybeSingle();

  if (affiliateError) throw new Error(affiliateError.message);

  if (!affiliate?.stripe_account_id || !affiliate.stripe_connected || !affiliate.stripe_payouts_enabled) {
    await logOperationalEvent({
      companyId: payout.company_id as string,
      payoutBatchId: payout.payout_batch_id as string,
      payoutId: payout.id as string,
      affiliateId: payout.affiliate_id as string,
      actorUserId,
      source: "payouts",
      event: "transfer_skipped_affiliate_stripe",
      level: "warn",
      message: "Affiliate Stripe account was not ready for transfers.",
      metadata: {
        hasStripeAccountId: Boolean(affiliate?.stripe_account_id),
        stripeConnected: Boolean(affiliate?.stripe_connected),
        stripePayoutsEnabled: Boolean(affiliate?.stripe_payouts_enabled),
      },
    });
    throw new Error("Affiliate Stripe is not connected. Ask the affiliate to finish Stripe onboarding first.");
  }

  try {
    const { data: lockedPayout, error: processingError } = await admin
      .from("payouts")
      .update({
        status: "processing",
        error_message: null,
      })
      .eq("id", payout.id)
      .in("status", [...PROCESSABLE_PAYOUT_STATUSES])
      .select("id")
      .maybeSingle();

    if (processingError) throw new Error(processingError.message);
    if (!lockedPayout) throw new Error("Payout is already being processed.");

    await logOperationalEvent({
      companyId: payout.company_id as string,
      payoutBatchId: payout.payout_batch_id as string,
      payoutId: payout.id as string,
      affiliateId: payout.affiliate_id as string,
      actorUserId,
      source: "payouts",
      event: "transfer_started",
      message: "Stripe transfer started.",
      metadata: {
        amount: Number(payout.amount),
        currency: company.currency_code,
        sourceTransaction: transferSourceTransaction,
        destination: affiliate.stripe_account_id,
      },
    });

    const transfer = await sendAffiliateTransfer({
      amount: Number(payout.amount),
      currency: company.currency_code as string,
      destination: affiliate.stripe_account_id as string,
      idempotencyKey: `payout_${payout.id}`,
      sourceTransaction: transferSourceTransaction,
      transferGroup: `payout_batch_${payout.payout_batch_id}`,
      metadata: {
        payoutId: payout.id as string,
        payoutBatchId: payout.payout_batch_id as string,
        companyId: payout.company_id as string,
        affiliateId: payout.affiliate_id as string,
      },
    });

    const paidAt = new Date().toISOString();
    const { error: updatePayoutError } = await admin
      .from("payouts")
      .update({
        status: "paid",
        stripe_transfer_id: transfer.id,
        paid_at: paidAt,
        error_message: null,
      })
      .eq("id", payout.id);
    if (updatePayoutError) throw new Error(updatePayoutError.message);

    const { data: payoutItems, error: itemsError } = await admin
      .from("payout_items")
      .select("commission_id")
      .eq("payout_id", payout.id);
    if (itemsError) throw new Error(itemsError.message);

    const commissionIds = (payoutItems ?? []).map((item) => item.commission_id as string);
    if (commissionIds.length > 0) {
      const { error: commissionError } = await admin
        .from("commissions")
        .update({
          status: "paid",
          paid_at: paidAt,
          stripe_transfer_id: transfer.id,
        })
        .in("id", commissionIds);
      if (commissionError) throw new Error(commissionError.message);
    }

    await refreshBatchStatus(admin, payout.payout_batch_id as string);

    await logOperationalEvent({
      companyId: payout.company_id as string,
      payoutBatchId: payout.payout_batch_id as string,
      payoutId: payout.id as string,
      affiliateId: payout.affiliate_id as string,
      actorUserId,
      source: "payouts",
      event: "transfer_paid",
      message: "Stripe transfer completed and payout marked paid.",
      metadata: {
        stripeTransferId: transfer.id,
        commissionCount: commissionIds.length,
      },
    });

    return {
      ok: true,
      payoutId: payout.id as string,
      stripeTransferId: transfer.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe transfer failed.";
    await admin
      .from("payouts")
      .update({
        status: "failed",
        error_message: message,
      })
      .eq("id", payout.id);

    await refreshBatchStatus(admin, payout.payout_batch_id as string);

    await logOperationalEvent({
      companyId: payout.company_id as string,
      payoutBatchId: payout.payout_batch_id as string,
      payoutId: payout.id as string,
      affiliateId: payout.affiliate_id as string,
      actorUserId,
      source: "payouts",
      event: "transfer_failed",
      level: "error",
      message: "Stripe transfer failed.",
      metadata: errorMetadata(error),
    });

    throw error;
  }
}

async function resolveTransferSourceTransaction({
  admin,
  payoutBatchId,
  sourceTransaction,
  storedChargeId,
  paymentIntentId,
}: {
  admin: SupabaseAdmin;
  payoutBatchId: string;
  sourceTransaction?: string | null;
  storedChargeId?: string | null;
  paymentIntentId?: string | null;
}) {
  const candidate = sourceTransaction ?? storedChargeId ?? null;
  if (candidate?.startsWith("ch_")) return candidate;

  if (!paymentIntentId) return candidate;

  const chargeId = await getPaymentIntentLatestChargeId(paymentIntentId);
  if (!chargeId) return candidate;

  if (chargeId !== storedChargeId) {
    await admin
      .from("payout_batches")
      .update({ stripe_payment_charge_id: chargeId })
      .eq("id", payoutBatchId);
  }

  return chargeId;
}

export async function processFundedPayoutBatch({
  batchId,
  checkoutSessionId,
  paymentIntentId,
  chargeId,
}: {
  batchId: string;
  checkoutSessionId: string;
  paymentIntentId: string;
  chargeId: string;
}) {
  const admin = createSupabaseAdminClient();
  const fundedAt = new Date().toISOString();

  const { data: batch, error: batchError } = await admin
    .from("payout_batches")
    .select("id, company_id")
    .eq("id", batchId)
    .single();

  if (batchError) throw new Error(batchError.message);

  const { error: updateError } = await admin
    .from("payout_batches")
    .update({
      status: "processing",
      funding_status: "paid",
      stripe_checkout_session_id: checkoutSessionId,
      stripe_payment_intent_id: paymentIntentId,
      stripe_payment_charge_id: chargeId,
      funded_at: fundedAt,
      funding_error: null,
    })
    .eq("id", batchId);

  if (updateError) throw new Error(updateError.message);

  await logOperationalEvent({
    companyId: batch.company_id as string,
    payoutBatchId: batchId,
    source: "payouts",
    event: "batch_funded",
    message: "Payout batch funding payment succeeded.",
    metadata: {
      checkoutSessionId,
      paymentIntentId,
      chargeId,
    },
  });

  const { data: payouts, error: payoutsError } = await admin
    .from("payouts")
    .select("id")
    .eq("payout_batch_id", batchId)
    .in("status", [...PROCESSABLE_PAYOUT_STATUSES]);

  if (payoutsError) throw new Error(payoutsError.message);

  const failures: string[] = [];
  for (const payout of payouts ?? []) {
    try {
      await processPayoutTransfer({
        payoutId: payout.id as string,
        sourceTransaction: chargeId,
      });
    } catch (error) {
      failures.push(error instanceof Error ? error.message : "Unknown payout transfer failure.");
    }
  }

  await refreshBatchStatus(admin, batchId);

  if (failures.length > 0) {
    throw new Error(`${failures.length} payout transfer${failures.length === 1 ? "" : "s"} failed.`);
  }
}

export async function markPayoutFundingFailed({
  batchId,
  checkoutSessionId,
  message,
}: {
  batchId: string;
  checkoutSessionId: string;
  message: string;
}) {
  const admin = createSupabaseAdminClient();
  const { data: batch } = await admin
    .from("payout_batches")
    .select("company_id")
    .eq("id", batchId)
    .maybeSingle();

  const { error } = await admin
    .from("payout_batches")
    .update({
      status: "failed",
      funding_status: "failed",
      stripe_checkout_session_id: checkoutSessionId,
      funding_error: message,
    })
    .eq("id", batchId);

  if (error) throw new Error(error.message);

  await logOperationalEvent({
    companyId: (batch?.company_id as string | undefined) ?? null,
    payoutBatchId: batchId,
    source: "payouts",
    event: "batch_funding_failed",
    level: "error",
    message: "Payout batch funding payment failed.",
    metadata: {
      checkoutSessionId,
      error: message,
    },
  });
}

export async function refreshBatchStatus(admin: SupabaseAdmin, payoutBatchId: string) {
  const { data: payouts, error } = await admin
    .from("payouts")
    .select("status")
    .eq("payout_batch_id", payoutBatchId);

  if (error || !payouts) return;

  const statuses = payouts.map((item) => item.status as string);
  const nextStatus =
    statuses.length > 0 && statuses.every((status) => status === "paid")
      ? "paid"
      : statuses.some((status) => status === "failed")
        ? "failed"
        : statuses.some((status) => status === "processing")
          ? "processing"
          : statuses.some((status) => status === "approved")
            ? "approved"
            : "draft";

  await admin
    .from("payout_batches")
    .update({
      status: nextStatus,
      paid_at: nextStatus === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", payoutBatchId);
}
