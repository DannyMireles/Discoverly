import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const requestSchema = z.object({
  publicCode: z.string().min(3).max(64),
  lodgifyPromotionName: z.string().min(3).max(255),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response: authError } = await requireUser();
  if (authError) return authError;

  const { id } = await context.params;
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid rotation request." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: affiliate } = await admin
    .from("affiliates")
    .select("id, company_id")
    .eq("id", id)
    .maybeSingle();
  if (!affiliate) return NextResponse.json({ error: "Affiliate not found." }, { status: 404 });

  const { data: member } = await admin
    .from("company_users")
    .select("role")
    .eq("company_id", affiliate.company_id)
    .eq("user_id", user!.id)
    .in("role", ["owner", "admin"])
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { data: currentPromotion } = await admin
    .from("affiliate_promotions")
    .select("*")
    .eq("affiliate_id", affiliate.id)
    .in("status", ["draft", "active", "paused"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!currentPromotion) {
    return NextResponse.json({ error: "No active promotion to rotate." }, { status: 404 });
  }

  const newPublicCode = parsed.data.publicCode.trim().toUpperCase();
  const newLodgifyName = parsed.data.lodgifyPromotionName.trim();

  const unchanged =
    newPublicCode === (currentPromotion.public_code as string).toUpperCase() &&
    newLodgifyName === (currentPromotion.lodgify_promotion_name as string);
  if (unchanged) {
    return NextResponse.json({ error: "New values match current values." }, { status: 400 });
  }

  const { data: collision } = await admin
    .from("affiliate_promotions")
    .select("id")
    .eq("company_id", affiliate.company_id)
    .or(
      `public_code.eq.${encodeURIComponent(newPublicCode)},lodgify_promotion_name.eq.${encodeURIComponent(newLodgifyName)}`,
    )
    .limit(1)
    .maybeSingle();
  if (collision) {
    return NextResponse.json(
      { error: "Another promotion in this company already uses that code or Lodgify name." },
      { status: 409 },
    );
  }

  const nowIso = new Date().toISOString();
  const { error: expireError } = await admin
    .from("affiliate_promotions")
    .update({ status: "expired", updated_at: nowIso, expires_at: nowIso })
    .eq("id", currentPromotion.id);
  if (expireError) {
    return NextResponse.json({ error: expireError.message }, { status: 500 });
  }

  const { data: newPromotion, error: insertError } = await admin
    .from("affiliate_promotions")
    .insert({
      company_id: affiliate.company_id,
      affiliate_id: affiliate.id,
      public_code: newPublicCode,
      lodgify_promotion_name: newLodgifyName,
      guest_discount_type: currentPromotion.guest_discount_type,
      guest_discount_value: currentPromotion.guest_discount_value,
      affiliate_payout_type: currentPromotion.affiliate_payout_type,
      affiliate_payout_value: currentPromotion.affiliate_payout_value,
      affiliate_payout_base: currentPromotion.affiliate_payout_base,
      lodgify_setup_status: "needs_lodgify_setup",
      status: "active",
      internal_notes: currentPromotion.internal_notes,
    })
    .select("id, public_code, lodgify_promotion_name")
    .single();
  if (insertError || !newPromotion) {
    await admin
      .from("affiliate_promotions")
      .update({ status: currentPromotion.status, updated_at: currentPromotion.updated_at, expires_at: currentPromotion.expires_at })
      .eq("id", currentPromotion.id);
    return NextResponse.json({ error: insertError?.message ?? "Failed to create new promotion." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    previousPromotionId: currentPromotion.id,
    newPromotion: {
      id: newPromotion.id,
      publicCode: newPromotion.public_code,
      lodgifyPromotionName: newPromotion.lodgify_promotion_name,
    },
  });
}
