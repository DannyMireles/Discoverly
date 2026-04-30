import type { PayoutBase, PayoutType } from "@/lib/constants";
import type {
  LodgifyPriceItem,
  LodgifyRawBooking,
  NormalizedLodgifyBooking,
} from "@/lib/lodgify/types";

export type AffiliatePromotionForMatch = {
  id: string;
  affiliate_id: string;
  lodgify_promotion_name: string;
  affiliate_payout_type: PayoutType;
  affiliate_payout_value: number;
  affiliate_payout_base: PayoutBase;
};

export type MatchedPromotion = {
  promotion: AffiliatePromotionForMatch;
  priceItem: LodgifyPriceItem;
  description: string;
};

export type CommissionCalculation = {
  bookingTotal: number;
  commissionBaseAmount: number;
  commissionType: PayoutType;
  commissionValue: number;
  commissionAmount: number;
};

export function isBookingFullyPaid(booking: LodgifyRawBooking) {
  const status = booking.status === "Booked";
  const active = booking.is_deleted !== true && !booking.canceled_at;
  const amountPaid = toNumber(booking.amount_paid);
  const totalAmount = toNumber(booking.total_amount);
  const hasCompletedPayment = (booking.transactions ?? []).some(
    (transaction) => transaction.type === "Payment" && transaction.status === "Done",
  );

  return status && active && amountPaid >= totalAmount && totalAmount > 0 && hasCompletedPayment;
}

export function extractStaySubtotal(booking: LodgifyRawBooking) {
  return toNumber(booking.subtotals?.stay);
}

export function extractPromotionItems(booking: LodgifyRawBooking) {
  return (booking.quote?.room_type_items ?? []).flatMap((roomTypeItem) =>
    (roomTypeItem.prices ?? []).filter((price) => price.type === "Promotion"),
  );
}

export function findMatchedPromotion(
  booking: LodgifyRawBooking,
  affiliatePromotions: AffiliatePromotionForMatch[],
) {
  const promotionsByName = new Map(
    affiliatePromotions.map((promotion) => [
      promotion.lodgify_promotion_name.trim(),
      promotion,
    ]),
  );

  for (const priceItem of extractPromotionItems(booking)) {
    const description = priceItem.description?.trim();
    if (!description) continue;

    const promotion = promotionsByName.get(description);
    if (promotion) {
      return {
        promotion,
        priceItem,
        description,
      } satisfies MatchedPromotion;
    }
  }

  return null;
}

export function calculateCommission(
  booking: Pick<NormalizedLodgifyBooking, "totalAmount" | "staySubtotal">,
  promotion: Pick<
    AffiliatePromotionForMatch,
    "affiliate_payout_type" | "affiliate_payout_value" | "affiliate_payout_base"
  >,
) {
  const commissionBaseAmount = getCommissionBaseAmount(booking, promotion.affiliate_payout_base);
  const commissionAmount =
    promotion.affiliate_payout_type === "percent"
      ? roundCurrency((commissionBaseAmount * promotion.affiliate_payout_value) / 100)
      : roundCurrency(promotion.affiliate_payout_value);

  return {
    bookingTotal: roundCurrency(booking.totalAmount),
    commissionBaseAmount: roundCurrency(commissionBaseAmount),
    commissionType: promotion.affiliate_payout_type,
    commissionValue: promotion.affiliate_payout_value,
    commissionAmount,
  } satisfies CommissionCalculation;
}

export function getCommissionBaseAmount(
  booking: Pick<NormalizedLodgifyBooking, "totalAmount" | "staySubtotal">,
  payoutBase: PayoutBase,
) {
  if (payoutBase === "stay_subtotal") {
    return booking.staySubtotal;
  }

  if (payoutBase === "booking_total") {
    return booking.totalAmount;
  }

  return booking.staySubtotal;
}

export function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
