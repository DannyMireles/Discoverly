import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { logOperationalEvent, errorMetadata } from "@/lib/ops/events";
import { createPayoutFundingCheckoutSession } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const FUNDABLE_PAYOUT_STATUSES = ["pending", "approved", "failed"] as const;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response: authError } = await requireUser();
  if (authError) return authError;

  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid payout batch." }, { status: 400 });
  }

  const batchId = parsedParams.data.id;
  const requestUrl = new URL(request.url);
  const admin = createSupabaseAdminClient();

  const { data: batch, error: batchError } = await admin
    .from("payout_batches")
    .select("id, company_id, status, funding_status")
    .eq("id", batchId)
    .maybeSingle();

  if (batchError) {
    return NextResponse.json({ error: batchError.message }, { status: 500 });
  }

  if (!batch) {
    return NextResponse.json({ error: "Payout batch not found." }, { status: 404 });
  }

  const { data: member, error: memberError } = await admin
    .from("company_users")
    .select("role")
    .eq("company_id", batch.company_id)
    .eq("user_id", user!.id)
    .in("role", ["owner", "admin"])
    .maybeSingle();

  if (memberError) {
    await logOperationalEvent({
      companyId: batch.company_id as string,
      payoutBatchId: batchId,
      actorUserId: user!.id,
      source: "payouts",
      event: "batch_funding_member_lookup_failed",
      level: "error",
      message: "Could not verify payout funding permissions.",
      metadata: { error: memberError.message },
    });
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  if (!member) {
    await logOperationalEvent({
      companyId: batch.company_id as string,
      payoutBatchId: batchId,
      actorUserId: user!.id,
      source: "payouts",
      event: "batch_funding_forbidden",
      level: "warn",
      message: "Non-admin attempted to fund a payout batch.",
    });
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const { data: company, error: companyError } = await admin
      .from("companies")
      .select("id, name, currency_code")
      .eq("id", batch.company_id)
      .single();

    if (companyError) throw new Error(companyError.message);

    const { data: payouts, error: payoutsError } = await admin
      .from("payouts")
      .select("id, affiliate_id, amount, status")
      .eq("payout_batch_id", batchId)
      .in("status", [...FUNDABLE_PAYOUT_STATUSES]);

    if (payoutsError) throw new Error(payoutsError.message);
    if (!payouts || payouts.length === 0) {
      return NextResponse.json(
        { error: "This batch has no payable affiliate payouts. Prepare the current batch first." },
        { status: 422 },
      );
    }

    const affiliateIds = [...new Set(payouts.map((payout) => payout.affiliate_id as string))];
    const { data: affiliates, error: affiliatesError } = await admin
      .from("affiliates")
      .select("id, name, stripe_account_id, stripe_connected, stripe_payouts_enabled")
      .in("id", affiliateIds);

    if (affiliatesError) throw new Error(affiliatesError.message);

    const affiliatesById = new Map((affiliates ?? []).map((affiliate) => [affiliate.id as string, affiliate]));
    const notReady = payouts
      .map((payout) => affiliatesById.get(payout.affiliate_id as string))
      .filter(
        (affiliate) =>
          !affiliate?.stripe_account_id ||
          !affiliate.stripe_connected ||
          !affiliate.stripe_payouts_enabled,
      );

    if (notReady.length > 0) {
      return NextResponse.json(
        {
          error: `Finish Stripe onboarding for ${notReady
            .map((affiliate) => affiliate?.name ?? "an affiliate")
            .join(", ")} before funding this payout batch.`,
        },
        { status: 422 },
      );
    }

    const totalAmount = payouts.reduce((sum, payout) => sum + Number(payout.amount ?? 0), 0);
    if (totalAmount <= 0) {
      return NextResponse.json(
        { error: "Payout batch amount must be greater than zero." },
        { status: 422 },
      );
    }

    const session = await createPayoutFundingCheckoutSession({
      batchId,
      companyId: company.id as string,
      companyName: company.name as string,
      customerEmail: user!.email,
      amount: totalAmount,
      currency: company.currency_code as string,
      successUrl: `${requestUrl.origin}/company/payouts?funding=success&batchId=${batchId}`,
      cancelUrl: `${requestUrl.origin}/company/payouts?funding=cancelled&batchId=${batchId}`,
    });

    const now = new Date().toISOString();
    const { error: approvePayoutsError } = await admin
      .from("payouts")
      .update({
        status: "approved",
        approved_at: now,
        error_message: null,
      })
      .in("id", payouts.map((payout) => payout.id as string));

    if (approvePayoutsError) throw new Error(approvePayoutsError.message);

    const { error: updateBatchError } = await admin
      .from("payout_batches")
      .update({
        status: "approved",
        funding_status: "checkout_created",
        total_amount: totalAmount,
        stripe_checkout_session_id: session.id,
        funding_error: null,
        approved_by: user!.id,
        approved_at: now,
      })
      .eq("id", batchId);

    if (updateBatchError) throw new Error(updateBatchError.message);

    await logOperationalEvent({
      companyId: batch.company_id as string,
      payoutBatchId: batchId,
      actorUserId: user!.id,
      source: "payouts",
      event: "batch_funding_checkout_created",
      message: "Stripe Checkout funding session created for payout batch.",
      metadata: {
        checkoutSessionId: session.id,
        amount: totalAmount,
        currency: company.currency_code,
        payoutCount: payouts.length,
      },
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    await logOperationalEvent({
      companyId: batch.company_id as string,
      payoutBatchId: batchId,
      actorUserId: user!.id,
      source: "payouts",
      event: "batch_funding_checkout_failed",
      level: "error",
      message: "Could not create payout funding checkout session.",
      metadata: errorMetadata(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not fund payout batch." },
      { status: 500 },
    );
  }
}
