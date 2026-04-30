import { z } from "zod";
import { ZENFUL_COVE_DEFAULTS } from "@/lib/constants";
import {
  generateAffiliateSlug,
  generateLodgifyPromotionName,
  generatePublicCode,
  generateShortId,
} from "@/lib/naming";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const createAffiliateSchema = z.object({
  companyId: z.string().uuid(),
  companySlug: z.string().min(2).default(ZENFUL_COVE_DEFAULTS.companySlug),
  name: z.string().min(2),
  email: z.string().email(),
  publicCode: z.string().min(3).optional(),
  guestDiscountType: z.enum(["percent", "fixed"]).default("percent"),
  guestDiscountValue: z.number().nonnegative().default(10),
  affiliatePayoutType: z.enum(["percent", "fixed"]).default("percent"),
  affiliatePayoutValue: z.number().nonnegative().default(10),
  affiliatePayoutBase: z
    .enum(["stay_subtotal", "booking_total", "total_minus_taxes_fees"])
    .default("stay_subtotal"),
  expiresAt: z.string().datetime().optional(),
  internalNotes: z.string().optional(),
});

export type CreateAffiliateInput = z.infer<typeof createAffiliateSchema>;

export async function createAffiliate(input: CreateAffiliateInput) {
  const parsed = createAffiliateSchema.parse(input);
  const supabase = createSupabaseAdminClient();
  const affiliateSlug = generateAffiliateSlug(parsed.name);
  const publicCode =
    parsed.publicCode ??
    generatePublicCode(parsed.name, {
      type: parsed.guestDiscountType,
      value: parsed.guestDiscountValue,
    });
  const lodgifyPromotionName = generateLodgifyPromotionName({
    companySlug: parsed.companySlug,
    affiliateSlug,
    guestDiscount: {
      type: parsed.guestDiscountType,
      value: parsed.guestDiscountValue,
    },
    affiliatePayout: {
      type: parsed.affiliatePayoutType,
      value: parsed.affiliatePayoutValue,
    },
    shortId: generateShortId(),
  });

  const { data: affiliate, error: affiliateError } = await supabase
    .from("affiliates")
    .insert({
      company_id: parsed.companyId,
      name: parsed.name,
      email: parsed.email.toLowerCase(),
      slug: affiliateSlug,
      status: "invited",
    })
    .select("id, invite_token")
    .single();

  if (affiliateError) {
    throw new Error(affiliateError.message);
  }

  const { data: promotion, error: promotionError } = await supabase
    .from("affiliate_promotions")
    .insert({
      company_id: parsed.companyId,
      affiliate_id: affiliate.id,
      public_code: publicCode.toUpperCase(),
      lodgify_promotion_name: lodgifyPromotionName,
      guest_discount_type: parsed.guestDiscountType,
      guest_discount_value: parsed.guestDiscountValue,
      affiliate_payout_type: parsed.affiliatePayoutType,
      affiliate_payout_value: parsed.affiliatePayoutValue,
      affiliate_payout_base: parsed.affiliatePayoutBase,
      lodgify_setup_status: "needs_lodgify_setup",
      status: "draft",
      expires_at: parsed.expiresAt ?? null,
      internal_notes: parsed.internalNotes ?? null,
    })
    .select("id, public_code, lodgify_promotion_name")
    .single();

  if (promotionError) {
    throw new Error(promotionError.message);
  }

  return {
    affiliateId: affiliate.id as string,
    promotionId: promotion.id as string,
    inviteToken: affiliate.invite_token as string,
    publicCode: promotion.public_code as string,
    lodgifyPromotionName: promotion.lodgify_promotion_name as string,
  };
}
