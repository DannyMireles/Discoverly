export type LodgifyTransaction = {
  type?: string | null;
  status?: string | null;
  amount?: number | string | null;
};

export type LodgifyPriceItem = {
  type?: string | null;
  amount?: number | string | null;
  description?: string | null;
};

export type LodgifyRoomTypeItem = {
  property_id?: number | string | null;
  room_type_id?: number | string | null;
  prices?: LodgifyPriceItem[] | null;
};

export type LodgifyRawBooking = {
  id?: number | string | null;
  status?: string | null;
  is_deleted?: boolean | null;
  canceled_at?: string | null;
  currency_code?: string | null;
  total_amount?: number | string | null;
  amount_paid?: number | string | null;
  amount_due?: number | string | null;
  arrival?: string | null;
  departure?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  guest?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  property_id?: number | string | null;
  room_type_id?: number | string | null;
  quote?: {
    room_type_items?: LodgifyRoomTypeItem[] | null;
  } | null;
  subtotals?: {
    stay?: number | string | null;
  } | null;
  transactions?: LodgifyTransaction[] | null;
};

export type NormalizedLodgifyBooking = {
  lodgifyBookingId: number;
  propertyId: number | null;
  roomTypeId: number | null;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  arrival: string | null;
  departure: string | null;
  bookingStatus: string | null;
  isDeleted: boolean;
  canceledAt: string | null;
  currencyCode: string | null;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  staySubtotal: number;
  promotionAmount: number | null;
  promotionDescription: string | null;
  isFullyPaid: boolean;
  rawPayload: LodgifyRawBooking;
  lodgifyCreatedAt: string | null;
  lodgifyUpdatedAt: string | null;
};
