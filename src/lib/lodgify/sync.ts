import { calculateCommission, findMatchedPromotion, type AffiliatePromotionForMatch } from "@/lib/commissions";
import { fetchBookingById, fetchBookings, normalizeLodgifyBooking } from "@/lib/lodgify";
import type { LodgifyRawBooking } from "@/lib/lodgify/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type SyncLodgifyBookingsInput = {
  companyId: string;
  apiKey: string;
  bookingId?: string | number;
  modifiedSince?: string;
};

export async function syncLodgifyBookings(input: SyncLodgifyBookingsInput) {
  const supabase = createSupabaseAdminClient();
  const promotions = await loadAffiliatePromotions(input.companyId);
  const rawBookings = await loadRawBookings(input);
  const results = [];

  for (const rawBooking of rawBookings) {
    const normalized = normalizeLodgifyBooking(rawBooking);
    if (!normalized.lodgifyBookingId) continue;

    const match = findMatchedPromotion(rawBooking, promotions);
    const booking = await upsertBooking(input.companyId, normalized, match?.promotion ?? null);

    if (normalized.promotionDescription && !match) {
      await upsertUnmatchedPromotion(input.companyId, booking.id, normalized);
    }

    if ((normalized.canceledAt || normalized.isDeleted) && match) {
      await markCanceledCommission(input.companyId, booking.id);
    }

    if (match && normalized.isFullyPaid) {
      const commission = calculateCommission(normalized, match.promotion);
      await supabase.from("commissions").upsert(
        {
          company_id: input.companyId,
          affiliate_id: match.promotion.affiliate_id,
          affiliate_promotion_id: match.promotion.id,
          lodgify_booking_id: booking.id,
          booking_total: commission.bookingTotal,
          commission_base_amount: commission.commissionBaseAmount,
          commission_type: commission.commissionType,
          commission_value: commission.commissionValue,
          commission_amount: commission.commissionAmount,
          status: getInitialCommissionStatus(normalized.departure),
        },
        { onConflict: "company_id,lodgify_booking_id" },
      );
    }

    results.push({
      lodgifyBookingId: normalized.lodgifyBookingId,
      isFullyPaid: normalized.isFullyPaid,
      matched: Boolean(match),
      promotionDescription: normalized.promotionDescription,
    });
  }

  await supabase.from("sync_logs").insert({
    company_id: input.companyId,
    source: "lodgify",
    status: "success",
    message: `Synced ${results.length} Lodgify bookings.`,
    finished_at: new Date().toISOString(),
    metadata: { results },
  });

  return results;
}

async function loadAffiliatePromotions(companyId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("affiliate_promotions")
    .select("id, affiliate_id, lodgify_promotion_name, affiliate_payout_type, affiliate_payout_value, affiliate_payout_base")
    .eq("company_id", companyId)
    .in("status", ["draft", "active"]);

  if (error) throw new Error(error.message);
  return (data ?? []).map((promotion) => ({
    id: promotion.id as string,
    affiliate_id: promotion.affiliate_id as string,
    lodgify_promotion_name: promotion.lodgify_promotion_name as string,
    affiliate_payout_type: promotion.affiliate_payout_type as AffiliatePromotionForMatch["affiliate_payout_type"],
    affiliate_payout_value: Number(promotion.affiliate_payout_value),
    affiliate_payout_base: promotion.affiliate_payout_base as AffiliatePromotionForMatch["affiliate_payout_base"],
  }));
}

async function loadRawBookings(input: SyncLodgifyBookingsInput) {
  if (input.bookingId) {
    return [await fetchBookingById(input.apiKey, input.bookingId)];
  }

  const response = await fetchBookings(input.apiKey, {
    size: 50,
    updatedSince: input.modifiedSince,
    trash: false,
  });

  if (Array.isArray(response)) {
    return response as LodgifyRawBooking[];
  }

  const items = (response as { items?: unknown[] }).items;
  return Array.isArray(items) ? (items as LodgifyRawBooking[]) : [];
}

async function upsertBooking(
  companyId: string,
  normalized: ReturnType<typeof normalizeLodgifyBooking>,
  promotion: AffiliatePromotionForMatch | null,
) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("lodgify_bookings")
    .upsert(
      {
        company_id: companyId,
        lodgify_booking_id: normalized.lodgifyBookingId,
        property_id: normalized.propertyId,
        room_type_id: normalized.roomTypeId,
        guest_name: normalized.guestName,
        guest_email: normalized.guestEmail,
        guest_phone: normalized.guestPhone,
        arrival: normalized.arrival,
        departure: normalized.departure,
        booking_status: normalized.bookingStatus,
        is_deleted: normalized.isDeleted,
        canceled_at: normalized.canceledAt,
        currency_code: normalized.currencyCode,
        total_amount: normalized.totalAmount,
        amount_paid: normalized.amountPaid,
        amount_due: normalized.amountDue,
        stay_subtotal: normalized.staySubtotal,
        promotion_amount: normalized.promotionAmount,
        promotion_description: normalized.promotionDescription,
        is_fully_paid: normalized.isFullyPaid,
        is_affiliate_matched: Boolean(promotion),
        affiliate_id: promotion?.affiliate_id ?? null,
        affiliate_promotion_id: promotion?.id ?? null,
        raw_payload: normalized.rawPayload,
        lodgify_created_at: normalized.lodgifyCreatedAt,
        lodgify_updated_at: normalized.lodgifyUpdatedAt,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "company_id,lodgify_booking_id" },
    )
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data as { id: string };
}

async function upsertUnmatchedPromotion(
  companyId: string,
  bookingId: string,
  normalized: ReturnType<typeof normalizeLodgifyBooking>,
) {
  const supabase = createSupabaseAdminClient();
  await supabase.from("unmatched_promotions").upsert(
    {
      company_id: companyId,
      lodgify_booking_id: bookingId,
      promotion_description: normalized.promotionDescription,
      promotion_amount: normalized.promotionAmount,
      status: "open",
    },
    { onConflict: "company_id,lodgify_booking_id,promotion_description" },
  );
}

async function markCanceledCommission(companyId: string, bookingId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: existing } = await supabase
    .from("commissions")
    .select("status")
    .eq("company_id", companyId)
    .eq("lodgify_booking_id", bookingId)
    .maybeSingle();

  if (!existing) return;

  await supabase
    .from("commissions")
    .update({
      status: existing.status === "paid" ? "clawback_needed" : "canceled",
    })
    .eq("company_id", companyId)
    .eq("lodgify_booking_id", bookingId);
}

function getInitialCommissionStatus(departure: string | null) {
  if (!departure) return "pending";
  return new Date(departure) < new Date() ? "eligible" : "pending";
}
