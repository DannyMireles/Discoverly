import { NextResponse } from "next/server";
import { z } from "zod";
import { errorMetadata, logOperationalEvent } from "@/lib/ops/events";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/guards";
import { sendAffiliateTransfer } from "@/lib/stripe";

const requestSchema = z.object({
  payoutId: z.string().uuid(),
});

export async function POST(request: Request) {
  const { user, response: authError } = await requireUser();
  if (authError) return authError;

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payout processing request." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: payout, error: payoutError } = await admin
    .from("payouts")
    .select("id, company_id, affiliate_id, payout_batch_id, amount, status, stripe_transfer_id")
    .eq("id", parsed.data.payoutId)
    .maybeSingle();

  if (payoutError) {
    return NextResponse.json({ error: payoutError.message }, { status: 500 });
  }

  if (!payout) {
    return NextResponse.json({ error: "Payout not found." }, { status: 404 });
  }

  const { data: member, error: memberError } = await admin
    .from("company_users")
    .select("role")
    .eq("company_id", payout.company_id)
    .eq("user_id", user!.id)
    .in("role", ["owner", "admin"])
    .maybeSingle();

  if (memberError) {
    await logOperationalEvent({
      companyId: payout.company_id as string,
      payoutBatchId: payout.payout_batch_id as string,
      payoutId: payout.id as string,
      affiliateId: payout.affiliate_id as string,
      actorUserId: user!.id,
      source: "payouts",
      event: "transfer_member_lookup_failed",
      level: "error",
      message: "Could not verify payout transfer permissions.",
      metadata: { error: memberError.message },
    });
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  if (!member) {
    await logOperationalEvent({
      companyId: payout.company_id as string,
      payoutBatchId: payout.payout_batch_id as string,
      payoutId: payout.id as string,
      affiliateId: payout.affiliate_id as string,
      actorUserId: user!.id,
      source: "payouts",
      event: "transfer_forbidden",
      level: "warn",
      message: "Non-admin attempted to process a payout.",
    });
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (payout.status === "paid" && payout.stripe_transfer_id) {
    return NextResponse.json({
      ok: true,
      payoutId: payout.id,
      stripeTransferId: payout.stripe_transfer_id,
      alreadyPaid: true,
    });
  }

  if (!["pending", "approved", "failed"].includes(payout.status as string)) {
    await logOperationalEvent({
      companyId: payout.company_id as string,
      payoutBatchId: payout.payout_batch_id as string,
      payoutId: payout.id as string,
      affiliateId: payout.affiliate_id as string,
      actorUserId: user!.id,
      source: "payouts",
      event: "transfer_skipped_status",
      level: "warn",
      message: "Payout was not processable in its current status.",
      metadata: { status: payout.status },
    });
    return NextResponse.json(
      { error: `Payout status ${payout.status} cannot be processed.` },
      { status: 409 },
    );
  }

  if (Number(payout.amount) <= 0) {
    await logOperationalEvent({
      companyId: payout.company_id as string,
      payoutBatchId: payout.payout_batch_id as string,
      payoutId: payout.id as string,
      affiliateId: payout.affiliate_id as string,
      actorUserId: user!.id,
      source: "payouts",
      event: "transfer_skipped_amount",
      level: "warn",
      message: "Payout amount must be greater than zero.",
      metadata: { amount: Number(payout.amount) },
    });
    return NextResponse.json(
      { error: "Payout amount must be greater than zero." },
      { status: 422 },
    );
  }

  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("currency_code, stripe_account_id, stripe_connected")
    .eq("id", payout.company_id)
    .single();

  if (companyError) {
    await logOperationalEvent({
      companyId: payout.company_id as string,
      payoutBatchId: payout.payout_batch_id as string,
      payoutId: payout.id as string,
      affiliateId: payout.affiliate_id as string,
      actorUserId: user!.id,
      source: "payouts",
      event: "transfer_company_load_failed",
      level: "error",
      message: "Company Stripe settings could not be loaded.",
      metadata: { error: companyError.message },
    });
    return NextResponse.json({ error: companyError.message }, { status: 500 });
  }

  if (!company?.stripe_connected || !company.stripe_account_id) {
    await logOperationalEvent({
      companyId: payout.company_id as string,
      payoutBatchId: payout.payout_batch_id as string,
      payoutId: payout.id as string,
      affiliateId: payout.affiliate_id as string,
      actorUserId: user!.id,
      source: "payouts",
      event: "transfer_skipped_company_stripe",
      level: "warn",
      message: "Company Stripe account was not ready for transfers.",
    });
    return NextResponse.json(
      { error: "Stripe is not connected for this company. Connect Stripe in Settings first." },
      { status: 422 },
    );
  }

  const { data: affiliate, error: affiliateError } = await admin
    .from("affiliates")
    .select("id, stripe_account_id, stripe_connected, stripe_payouts_enabled")
    .eq("id", payout.affiliate_id)
    .maybeSingle();

  if (affiliateError) {
    await logOperationalEvent({
      companyId: payout.company_id as string,
      payoutBatchId: payout.payout_batch_id as string,
      payoutId: payout.id as string,
      affiliateId: payout.affiliate_id as string,
      actorUserId: user!.id,
      source: "payouts",
      event: "transfer_affiliate_load_failed",
      level: "error",
      message: "Affiliate Stripe settings could not be loaded.",
      metadata: { error: affiliateError.message },
    });
    return NextResponse.json({ error: affiliateError.message }, { status: 500 });
  }

  if (!affiliate?.stripe_account_id || !affiliate.stripe_connected) {
    await logOperationalEvent({
      companyId: payout.company_id as string,
      payoutBatchId: payout.payout_batch_id as string,
      payoutId: payout.id as string,
      affiliateId: payout.affiliate_id as string,
      actorUserId: user!.id,
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
    return NextResponse.json(
      { error: "Affiliate Stripe is not connected. Ask the affiliate to finish Stripe onboarding first." },
      { status: 422 },
    );
  }

  try {
    const { data: lockedPayout, error: processingError } = await admin
      .from("payouts")
      .update({
        status: "processing",
        error_message: null,
      })
      .eq("id", payout.id)
      .in("status", ["pending", "approved", "failed"])
      .select("id")
      .maybeSingle();

    if (processingError) throw new Error(processingError.message);
    if (!lockedPayout) {
      await logOperationalEvent({
        companyId: payout.company_id as string,
        payoutBatchId: payout.payout_batch_id as string,
        payoutId: payout.id as string,
        affiliateId: payout.affiliate_id as string,
        actorUserId: user!.id,
        source: "payouts",
        event: "transfer_skipped_locked",
        level: "warn",
        message: "Payout was already locked by another process.",
      });
      return NextResponse.json(
        { error: "Payout is already being processed." },
        { status: 409 },
      );
    }

    await logOperationalEvent({
      companyId: payout.company_id as string,
      payoutBatchId: payout.payout_batch_id as string,
      payoutId: payout.id as string,
      affiliateId: payout.affiliate_id as string,
      actorUserId: user!.id,
      source: "payouts",
      event: "transfer_started",
      message: "Stripe transfer started.",
      metadata: {
        amount: Number(payout.amount),
        currency: company.currency_code,
        source: company.stripe_account_id,
        destination: affiliate.stripe_account_id,
      },
    });

    const transfer = await sendAffiliateTransfer({
      amount: Number(payout.amount),
      currency: company.currency_code as string,
      destination: affiliate.stripe_account_id as string,
      idempotencyKey: `payout_${payout.id}`,
      sourceAccountId: company.stripe_account_id as string,
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
      actorUserId: user!.id,
      source: "payouts",
      event: "transfer_paid",
      message: "Stripe transfer completed and payout marked paid.",
      metadata: {
        stripeTransferId: transfer.id,
        commissionCount: commissionIds.length,
      },
    });

    return NextResponse.json({
      ok: true,
      payoutId: payout.id,
      stripeTransferId: transfer.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe transfer failed.";
    await admin
      .from("payouts")
      .update({
        status: "failed",
        error_message: message,
      })
      .eq("id", payout.id);

    await logOperationalEvent({
      companyId: payout.company_id as string,
      payoutBatchId: payout.payout_batch_id as string,
      payoutId: payout.id as string,
      affiliateId: payout.affiliate_id as string,
      actorUserId: user!.id,
      source: "payouts",
      event: "transfer_failed",
      level: "error",
      message: "Stripe transfer failed.",
      metadata: errorMetadata(error),
    });

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}

async function refreshBatchStatus(admin: ReturnType<typeof createSupabaseAdminClient>, payoutBatchId: string) {
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
