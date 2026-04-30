import {
  extractPromotionItems,
  extractStaySubtotal,
  isBookingFullyPaid,
  toNumber,
} from "@/lib/commissions";
import type { LodgifyRawBooking, NormalizedLodgifyBooking } from "./types";

const LODGIFY_API_BASE_URL = "https://api.lodgify.com/v2";

export async function testLodgifyConnection(apiKey: string) {
  const response = await lodgifyFetch(apiKey, "/properties?size=1");
  return response.ok;
}

export async function fetchProperties(apiKey: string) {
  return lodgifyJson(apiKey, "/properties?size=100");
}

export async function fetchBookings(
  apiKey: string,
  params: Record<string, string | number | boolean | undefined> = {},
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";
  return lodgifyJson(apiKey, `/reservations/bookings${suffix}`);
}

export async function fetchBookingById(apiKey: string, bookingId: number | string) {
  return lodgifyJson(apiKey, `/reservations/bookings/${bookingId}`) as Promise<LodgifyRawBooking>;
}

export function normalizeLodgifyBooking(raw: LodgifyRawBooking): NormalizedLodgifyBooking {
  const firstRoomTypeItem = raw.quote?.room_type_items?.[0] ?? null;
  const firstPromotion = extractPromotionItems(raw)[0] ?? null;

  return {
    lodgifyBookingId: toNumber(raw.id),
    propertyId: nullableNumber(raw.property_id ?? firstRoomTypeItem?.property_id),
    roomTypeId: nullableNumber(raw.room_type_id ?? firstRoomTypeItem?.room_type_id),
    guestName: raw.guest?.name ?? raw.guest_name ?? null,
    guestEmail: raw.guest?.email ?? raw.guest_email ?? null,
    guestPhone: raw.guest?.phone ?? raw.guest_phone ?? null,
    arrival: raw.arrival ?? null,
    departure: raw.departure ?? null,
    bookingStatus: raw.status ?? null,
    isDeleted: raw.is_deleted === true,
    canceledAt: raw.canceled_at ?? null,
    currencyCode: raw.currency_code ?? null,
    totalAmount: toNumber(raw.total_amount),
    amountPaid: toNumber(raw.amount_paid),
    amountDue: toNumber(raw.amount_due),
    staySubtotal: extractStaySubtotal(raw),
    promotionAmount: firstPromotion ? toNumber(firstPromotion.amount) : null,
    promotionDescription: firstPromotion?.description?.trim() ?? null,
    isFullyPaid: isBookingFullyPaid(raw),
    rawPayload: raw,
    lodgifyCreatedAt: raw.created_at ?? null,
    lodgifyUpdatedAt: raw.updated_at ?? null,
  };
}

export function extractPromotionDescription(raw: LodgifyRawBooking) {
  return extractPromotionItems(raw)
    .map((item) => item.description?.trim())
    .find((description): description is string => Boolean(description)) ?? null;
}

async function lodgifyJson(apiKey: string, path: string) {
  const response = await lodgifyFetch(apiKey, path);
  if (!response.ok) {
    throw new Error(`Lodgify request failed with ${response.status}`);
  }
  return response.json() as Promise<unknown>;
}

async function lodgifyFetch(apiKey: string, path: string) {
  return fetch(`${LODGIFY_API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      "X-ApiKey": apiKey,
    },
    cache: "no-store",
  });
}

function nullableNumber(value: number | string | null | undefined) {
  const parsed = toNumber(value);
  return parsed > 0 ? parsed : null;
}
