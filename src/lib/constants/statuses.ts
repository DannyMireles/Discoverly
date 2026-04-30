export const APP_NAME = "Discoverly.ai";

export const ZENFUL_COVE_DEFAULTS = {
  companyName: "Zenful Cove",
  companySlug: "ZENCOVE",
  publicCompanySlug: "zenful-cove",
  timezone: "America/Chicago",
  currencyCode: "USD",
  guestDiscountType: "percent",
  guestDiscountValue: 10,
  affiliatePayoutType: "percent",
  affiliatePayoutValue: 10,
  affiliatePayoutBase: "stay_subtotal",
  bookingSiteUrl: "https://zenfulcove.com",
} as const;

export const COMMISSION_STATUSES = [
  "pending",
  "eligible",
  "approved",
  "paid",
  "held",
  "canceled",
  "clawback_needed",
] as const;

export const PROMOTION_STATUSES = ["draft", "active", "paused", "expired", "error"] as const;

export const LODGIFY_SETUP_STATUSES = ["draft", "needs_lodgify_setup", "confirmed"] as const;

export const PAYOUT_BATCH_STATUSES = [
  "draft",
  "approved",
  "processing",
  "paid",
  "failed",
  "canceled",
] as const;

export const PAYOUT_STATUSES = [
  "pending",
  "approved",
  "processing",
  "paid",
  "failed",
  "held",
  "canceled",
] as const;

export const AFFILIATE_STATUSES = ["invited", "active", "paused", "archived"] as const;

export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];
export type PromotionStatus = (typeof PROMOTION_STATUSES)[number];
export type LodgifySetupStatus = (typeof LODGIFY_SETUP_STATUSES)[number];
export type PayoutBatchStatus = (typeof PAYOUT_BATCH_STATUSES)[number];
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];
export type AffiliateStatus = (typeof AFFILIATE_STATUSES)[number];

export type DiscountType = "percent" | "fixed";
export type PayoutType = "percent" | "fixed";
export type PayoutBase = "stay_subtotal" | "booking_total" | "total_minus_taxes_fees";

export const DATE_RANGE_OPTIONS = [
  { label: "Last 7 days", value: "last_7_days" },
  { label: "Last 30 days", value: "last_30_days" },
  { label: "This month", value: "this_month" },
  { label: "Last month", value: "last_month" },
  { label: "Year to date", value: "year_to_date" },
  { label: "Custom", value: "custom" },
] as const;
