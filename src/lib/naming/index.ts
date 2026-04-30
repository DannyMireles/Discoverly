import { z } from "zod";
import type { DiscountType, PayoutType } from "@/lib/constants";
import { stripTrailingZeros } from "@/lib/utils/format";

const slugPartSchema = z.string().regex(/^[A-Z0-9]+$/);

export type MoneyOrPercent = {
  type: DiscountType | PayoutType;
  value: number;
};

export function generateAffiliateSlug(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join("")
    .toUpperCase();

  return slug || "AFFILIATE";
}

export function generatePublicCode(name: string, discount: MoneyOrPercent) {
  const affiliate = generateAffiliateSlug(name).slice(0, 16);
  const amount = stripTrailingZeros(discount.value).replace(".", "");
  return `${affiliate}${amount}`;
}

export function formatDiscountToken(type: DiscountType, value: number) {
  return formatMoneyOrPercentToken(type, value);
}

export function formatPayoutToken(type: PayoutType, value: number) {
  return formatMoneyOrPercentToken(type, value);
}

export function generateShortId(length = 4) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 255);
    }
  }

  return Array.from(bytes)
    .map((byte) => alphabet[byte % alphabet.length])
    .join("");
}

export function generateLodgifyPromotionName({
  companySlug,
  affiliateSlug,
  guestDiscount,
  affiliatePayout,
  shortId = generateShortId(),
}: {
  companySlug: string;
  affiliateSlug: string;
  guestDiscount: MoneyOrPercent;
  affiliatePayout: MoneyOrPercent;
  shortId?: string;
}) {
  const normalizedCompanySlug = normalizeTokenPart(companySlug);
  const normalizedAffiliateSlug = normalizeTokenPart(affiliateSlug);
  const discountToken = formatDiscountToken(guestDiscount.type, guestDiscount.value);
  const payoutToken = formatPayoutToken(affiliatePayout.type, affiliatePayout.value);
  const normalizedShortId = normalizeTokenPart(shortId).slice(0, 8);

  return `AFF_${normalizedCompanySlug}_${normalizedAffiliateSlug}_${discountToken}_${payoutToken}_${normalizedShortId}`;
}

export function validateLodgifyPromotionName(name: string) {
  const trimmed = name.trim();
  const parts = trimmed.split("_");

  if (parts.length !== 6 || parts[0] !== "AFF") {
    return false;
  }

  const [, company, affiliate, discount, payout, shortId] = parts;
  return [
    company,
    affiliate,
    shortId,
  ].every((part) => slugPartSchema.safeParse(part).success) &&
    isMoneyOrPercentToken(discount) &&
    isMoneyOrPercentToken(payout);
}

function formatMoneyOrPercentToken(type: DiscountType | PayoutType, value: number) {
  const amount = stripTrailingZeros(value).replace(".", "");
  return `${amount}${type === "percent" ? "PCT" : "USD"}`;
}

function isMoneyOrPercentToken(token: string) {
  return /^\d+(\d{0,2})?(PCT|USD)$/.test(token);
}

function normalizeTokenPart(value: string) {
  return generateAffiliateSlug(value).replace(/_/g, "");
}
