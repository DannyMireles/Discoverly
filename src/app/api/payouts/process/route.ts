import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { logOperationalEvent } from "@/lib/ops/events";
import { processPayoutTransfer } from "@/lib/payouts/transfers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
    .select("id, company_id, payout_batch_id")
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
      actorUserId: user!.id,
      source: "payouts",
      event: "transfer_forbidden",
      level: "warn",
      message: "Non-admin attempted to process a payout.",
    });
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const result = await processPayoutTransfer({
      payoutId: parsed.data.payoutId,
      actorUserId: user!.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Stripe transfer failed." },
      { status: 500 },
    );
  }
}
