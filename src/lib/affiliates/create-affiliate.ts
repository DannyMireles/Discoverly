import { z } from "zod";
import { ZENFUL_COVE_DEFAULTS } from "@/lib/constants";
import {
  generateAffiliateSlug,
  generateLodgifyPromotionName,
  generatePublicCode,
  generateShortId,
} from "@/lib/naming";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AffiliateStatus = "invited" | "active" | "paused" | "archived";
type PromotionStatus = "draft" | "active" | "paused" | "expired" | "error";
type LodgifySetupStatus = "draft" | "needs_lodgify_setup" | "confirmed";

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

export type AffiliateCreationSource = "company_portal" | "public_invite_link" | "system";

export type CreateAffiliateInput = z.infer<typeof createAffiliateSchema> & {
  userId?: string | null;
  status?: AffiliateStatus;
  inviteAcceptedAt?: string | null;
  createdVia?: AffiliateCreationSource;
  createdViaReference?: string | null;
  promotionStatus?: PromotionStatus;
  lodgifySetupStatus?: LodgifySetupStatus;
};

export async function createAffiliate(input: CreateAffiliateInput) {
  const parsed = createAffiliateSchema.parse(input);
  const supabase = createSupabaseAdminClient();
  const affiliateSlug = await resolveUniqueAffiliateSlug(
    supabase,
    parsed.companyId,
    generateAffiliateSlug(parsed.name),
  );
  const publicCode = parsed.publicCode
    ? parsed.publicCode.toUpperCase()
    : await resolveUniquePublicCode(
        supabase,
        parsed.companyId,
        generatePublicCode(parsed.name, {
          type: parsed.guestDiscountType,
          value: parsed.guestDiscountValue,
        }),
      );
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
      status: input.status ?? "invited",
      user_id: input.userId ?? null,
      invite_accepted_at: input.inviteAcceptedAt ?? null,
      created_via: input.createdVia ?? "company_portal",
      created_via_reference: input.createdViaReference ?? null,
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
      lodgify_setup_status: input.lodgifySetupStatus ?? "needs_lodgify_setup",
      status: input.promotionStatus ?? "draft",
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

async function resolveUniqueAffiliateSlug(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  companyId: string,
  baseSlug: string,
) {
  return resolveUniqueToken({
    baseToken: baseSlug,
    exists: async (candidate) => {
      const { data } = await supabase
        .from("affiliates")
        .select("id")
        .eq("company_id", companyId)
        .eq("slug", candidate)
        .limit(1)
        .maybeSingle();
      return Boolean(data?.id);
    },
  });
}

async function resolveUniquePublicCode(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  companyId: string,
  baseCode: string,
) {
  return resolveUniqueToken({
    baseToken: baseCode.toUpperCase(),
    exists: async (candidate) => {
      const { data } = await supabase
        .from("affiliate_promotions")
        .select("id")
        .eq("company_id", companyId)
        .eq("public_code", candidate)
        .limit(1)
        .maybeSingle();
      return Boolean(data?.id);
    },
  });
}

async function resolveUniqueToken({
  baseToken,
  exists,
}: {
  baseToken: string;
  exists: (candidate: string) => Promise<boolean>;
}) {
  const normalizedBase = baseToken.replace(/[^A-Z0-9]+/gi, "").toUpperCase() || "AFFILIATE";

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate =
      attempt === 0
        ? normalizedBase
        : `${normalizedBase.slice(0, Math.max(1, 48 - 5))}${generateShortId(5)}`;
    if (!(await exists(candidate))) return candidate;
  }

  return `${normalizedBase.slice(0, 40)}${Date.now().toString(36).toUpperCase()}`;
}
