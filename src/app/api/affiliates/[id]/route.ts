import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const patchSchema = z.object({
  affiliate: z
    .object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      status: z.enum(["invited", "active", "paused", "archived"]).optional(),
    })
    .optional(),
  promotion: z
    .object({
      guest_discount_type: z.enum(["percent", "fixed"]).optional(),
      guest_discount_value: z.number().nonnegative().optional(),
      affiliate_payout_type: z.enum(["percent", "fixed"]).optional(),
      affiliate_payout_value: z.number().nonnegative().optional(),
      affiliate_payout_base: z
        .enum(["stay_subtotal", "booking_total", "total_minus_taxes_fees"])
        .optional(),
      status: z.enum(["draft", "active", "paused", "expired", "error"]).optional(),
      lodgify_setup_status: z.enum(["draft", "needs_lodgify_setup", "confirmed"]).optional(),
      expires_at: z.string().datetime().nullable().optional(),
      internal_notes: z.string().nullable().optional(),
    })
    .optional(),
});

async function ensureAdmin(userId: string, affiliateId: string) {
  const admin = createSupabaseAdminClient();
  const { data: affiliate } = await admin
    .from("affiliates")
    .select("id, company_id")
    .eq("id", affiliateId)
    .maybeSingle();
  if (!affiliate) return { ok: false as const, response: NextResponse.json({ error: "Not found." }, { status: 404 }) };
  const { data: member } = await admin
    .from("company_users")
    .select("role")
    .eq("company_id", affiliate.company_id)
    .eq("user_id", userId)
    .in("role", ["owner", "admin"])
    .maybeSingle();
  if (!member) return { ok: false as const, response: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  return { ok: true as const, admin, affiliate };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response: authError } = await requireUser();
  if (authError) return authError;
  const { id } = await context.params;
  const guard = await ensureAdmin(user!.id, id);
  if (!guard.ok) return guard.response;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  const { admin, affiliate } = guard;

  if (parsed.data.affiliate && Object.keys(parsed.data.affiliate).length > 0) {
    const update: Record<string, unknown> = { ...parsed.data.affiliate, updated_at: new Date().toISOString() };
    if (parsed.data.affiliate.email) update.email = parsed.data.affiliate.email.toLowerCase();
    const { error: updateError } = await admin
      .from("affiliates")
      .update(update)
      .eq("id", affiliate.id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  if (parsed.data.promotion && Object.keys(parsed.data.promotion).length > 0) {
    const { error: promotionError } = await admin
      .from("affiliate_promotions")
      .update({ ...parsed.data.promotion, updated_at: new Date().toISOString() })
      .eq("affiliate_id", affiliate.id);
    if (promotionError) {
      return NextResponse.json({ error: promotionError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response: authError } = await requireUser();
  if (authError) return authError;
  const { id } = await context.params;
  const guard = await ensureAdmin(user!.id, id);
  if (!guard.ok) return guard.response;
  const { admin, affiliate } = guard;

  const { count: commissionCount, error: commissionError } = await admin
    .from("commissions")
    .select("id", { count: "exact", head: true })
    .eq("affiliate_id", affiliate.id);
  if (commissionError) {
    return NextResponse.json({ error: commissionError.message }, { status: 500 });
  }

  if ((commissionCount ?? 0) > 0) {
    const { error: archiveError } = await admin
      .from("affiliates")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", affiliate.id);
    if (archiveError) {
      return NextResponse.json({ error: archiveError.message }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      archived: true,
      commissionCount: commissionCount ?? 0,
      message: `Affiliate has ${commissionCount} commission(s) and was archived instead of deleted to preserve history.`,
    });
  }

  await admin.from("affiliate_promotions").delete().eq("affiliate_id", affiliate.id);
  const { error: deleteError } = await admin.from("affiliates").delete().eq("id", affiliate.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, archived: false });
}
