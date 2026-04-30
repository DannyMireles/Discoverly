import { format } from "date-fns";

export function formatCurrency(amount: number | null | undefined, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}

export function formatPercent(value: number | null | undefined) {
  return `${stripTrailingZeros(value ?? 0)}%`;
}

export function stripTrailingZeros(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

export function formatDate(value: Date | string | null | undefined, fallback = "Not set") {
  if (!value) return fallback;
  return format(new Date(value), "MMM d, yyyy");
}
