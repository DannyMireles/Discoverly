import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { logOperationalEvent, errorMetadata } from "@/lib/ops/events";
import { createPayoutBatch } from "@/lib/payouts/batches";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const requestSchema = z.object({
  companyId: z.string().uuid(),
});

export async function POST(request: Request) {
  const { user, response: authError } = await requireUser();
  if (authError) return authError;

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payout batch request." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: member, error: memberError } = await admin
    .from("company_users")
    .select("role")
    .eq("company_id", parsed.data.companyId)
    .eq("user_id", user!.id)
    .in("role", ["owner", "admin"])
    .maybeSingle();

  if (memberError) {
    await logOperationalEvent({
      companyId: parsed.data.companyId,
      actorUserId: user!.id,
      source: "payouts",
      event: "batch_member_lookup_failed",
      level: "error",
      message: "Could not verify payout batch permissions.",
      metadata: { error: memberError.message },
    });
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  if (!member) {
    await logOperationalEvent({
      companyId: parsed.data.companyId,
      actorUserId: user!.id,
      source: "payouts",
      event: "batch_forbidden",
      level: "warn",
      message: "Non-admin attempted to create a payout batch.",
    });
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const batch = await createPayoutBatch(parsed.data.companyId);
    await logOperationalEvent({
      companyId: parsed.data.companyId,
      payoutBatchId: batch.batchId,
      actorUserId: user!.id,
      source: "payouts",
      event: "batch_created",
      message: "Payout batch created or refreshed.",
      metadata: {
        periodStart: batch.periodStart,
        periodEnd: batch.periodEnd,
        payBy: batch.payBy,
        totalAmount: batch.totalAmount,
        payoutCount: batch.groups.length,
      },
    });
    return NextResponse.json({ ok: true, companyId: parsed.data.companyId, batch });
  } catch (error) {
    await logOperationalEvent({
      companyId: parsed.data.companyId,
      actorUserId: user!.id,
      source: "payouts",
      event: "batch_failed",
      level: "error",
      message: "Payout batch creation failed.",
      metadata: errorMetadata(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payout batch creation failed." },
      { status: 500 },
    );
  }
}
