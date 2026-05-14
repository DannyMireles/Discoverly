import { NextResponse } from "next/server";
import { z } from "zod";
import { createAffiliate } from "@/lib/affiliates/create-affiliate";
import { notifyCompanyOwnerAboutAffiliate } from "@/lib/affiliates/notify-company-owner";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  companySlug: z.string().min(2),
  name: z.string().min(2),
});

type DiscountType = "percent" | "fixed";
type PayoutBase = "stay_subtotal" | "booking_total" | "total_minus_taxes_fees";

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid affiliate signup request." }, { status: 400 });
  }

  const sessionSupabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessionSupabase.auth.getUser();

  const email = user?.email?.trim().toLowerCase();
  if (!user || !email) {
    return NextResponse.json({ error: "Verify your email before joining." }, { status: 401 });
  }

  const companySlug = normalizeCompanySlug(parsed.data.companySlug);
  const admin = createSupabaseAdminClient();
  const { data: company, error: companyError } = await admin
    .from("companies")
    .select(
      "id, name, slug, guest_discount_type, guest_discount_value, affiliate_payout_type, affiliate_payout_value, affiliate_payout_base",
    )
    .eq("slug", companySlug)
    .maybeSingle();

  if (companyError) {
    return NextResponse.json({ error: companyError.message }, { status: 500 });
  }

  if (!company) {
    return NextResponse.json({ error: "Affiliate program not found." }, { status: 404 });
  }

  const { data: existingAffiliate, error: existingError } = await admin
    .from("affiliates")
    .select("id, user_id, created_via, affiliate_promotions(public_code, lodgify_promotion_name)")
    .eq("company_id", company.id)
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existingAffiliate) {
    if (existingAffiliate.user_id === user.id) {
      return NextResponse.json({
        ok: true,
        affiliate: normalizeExistingAffiliate(existingAffiliate),
      });
    }

    return NextResponse.json(
      {
        error:
          "This email already has an affiliate record for this company. Ask the company owner to resend your invite.",
      },
      { status: 409 },
    );
  }

  const affiliateName = parsed.data.name.trim();
  const affiliate = await createAffiliate({
    companyId: company.id as string,
    companySlug: company.slug as string,
    name: affiliateName,
    email,
    guestDiscountType: asDiscountType(company.guest_discount_type),
    guestDiscountValue: Number(company.guest_discount_value ?? 10),
    affiliatePayoutType: asDiscountType(company.affiliate_payout_type),
    affiliatePayoutValue: Number(company.affiliate_payout_value ?? 10),
    affiliatePayoutBase: asPayoutBase(company.affiliate_payout_base),
    userId: user.id,
    status: "active",
    inviteAcceptedAt: new Date().toISOString(),
    createdVia: "public_invite_link",
    createdViaReference: `/join/${company.slug}`,
    promotionStatus: "active",
  });

  try {
    await notifyCompanyOwnerAboutAffiliate({
      supabase: admin,
      companyId: company.id as string,
      companyName: company.name as string,
      affiliateId: affiliate.affiliateId,
      affiliateName,
      affiliateEmail: email,
      publicCode: affiliate.publicCode,
      lodgifyPromotionName: affiliate.lodgifyPromotionName,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Owner notification failed.";
    await admin
      .from("affiliates")
      .update({ owner_notification_error: message })
      .eq("id", affiliate.affiliateId);
    console.error("[public-affiliate-signups] owner notification failed", {
      affiliateId: affiliate.affiliateId,
      companyId: company.id,
      error: message,
    });
  }

  return NextResponse.json({ ok: true, affiliate });
}

function normalizeCompanySlug(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function asDiscountType(value: unknown): DiscountType {
  return value === "fixed" ? "fixed" : "percent";
}

function asPayoutBase(value: unknown): PayoutBase {
  if (
    value === "booking_total" ||
    value === "total_minus_taxes_fees" ||
    value === "stay_subtotal"
  ) {
    return value;
  }
  return "stay_subtotal";
}

function normalizeExistingAffiliate(affiliate: {
  id: string;
  affiliate_promotions?: Array<{
    public_code: string;
    lodgify_promotion_name: string;
  }> | null;
}) {
  const promotion = affiliate.affiliate_promotions?.[0];
  return {
    affiliateId: affiliate.id,
    publicCode: promotion?.public_code ?? null,
    lodgifyPromotionName: promotion?.lodgify_promotion_name ?? null,
  };
}
