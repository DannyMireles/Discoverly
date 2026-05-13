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

export function formatOrdinalDay(day: number | null | undefined, fallback = "Not set") {
  if (!day || day < 1) return fallback;
  const rounded = Math.floor(day);
  const lastTwo = rounded % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${rounded}th`;
  switch (rounded % 10) {
    case 1:
      return `${rounded}st`;
    case 2:
      return `${rounded}nd`;
    case 3:
      return `${rounded}rd`;
    default:
      return `${rounded}th`;
  }
}
