import { NextResponse } from "next/server";
import { z } from "zod";
import { encryptSecret } from "@/lib/crypto/secrets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const settingsSchema = z.object({
  companyId: z.string().uuid(),
  currencyCode: z.string().length(3).optional(),
  timezone: z.string().min(2).optional(),
  bookingSiteUrl: z.string().url().optional().or(z.literal("")).optional(),
  guestDiscountType: z.enum(["percent", "fixed"]).optional(),
  guestDiscountValue: z.number().nonnegative().optional(),
  affiliatePayoutType: z.enum(["percent", "fixed"]).optional(),
  affiliatePayoutValue: z.number().nonnegative().optional(),
  affiliatePayoutBase: z.enum(["stay_subtotal", "booking_total", "total_minus_taxes_fees"]).optional(),
  payoutPayByDay: z.number().int().min(1).max(28).optional(),
  lodgifyApiKey: z.string().min(10).optional(),
});

export async function PATCH(request: Request) {
  const parsed = settingsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings payload." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: member } = await supabase
    .from("company_users")
    .select("role")
    .eq("company_id", parsed.data.companyId)
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"])
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const update: Record<string, unknown> = {};
  if (parsed.data.currencyCode) update.currency_code = parsed.data.currencyCode.toUpperCase();
  if (parsed.data.timezone) update.timezone = parsed.data.timezone;
  if (parsed.data.bookingSiteUrl !== undefined) update.booking_site_url = parsed.data.bookingSiteUrl || null;
  if (parsed.data.guestDiscountType) update.guest_discount_type = parsed.data.guestDiscountType;
  if (parsed.data.guestDiscountValue !== undefined) update.guest_discount_value = parsed.data.guestDiscountValue;
  if (parsed.data.affiliatePayoutType) update.affiliate_payout_type = parsed.data.affiliatePayoutType;
  if (parsed.data.affiliatePayoutValue !== undefined) update.affiliate_payout_value = parsed.data.affiliatePayoutValue;
  if (parsed.data.affiliatePayoutBase) update.affiliate_payout_base = parsed.data.affiliatePayoutBase;
  if (parsed.data.payoutPayByDay !== undefined) update.payout_pay_by_day = parsed.data.payoutPayByDay;
  if (parsed.data.lodgifyApiKey) {
    update.lodgify_api_key_encrypted = encryptSecret(parsed.data.lodgifyApiKey);
    update.lodgify_connected = true;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("companies")
    .update(update)
    .eq("id", parsed.data.companyId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, company: data });
}
