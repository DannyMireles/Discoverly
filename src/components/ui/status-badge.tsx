import { Badge } from "./badge";

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone =
    normalized.includes("paid") || normalized === "active" || normalized === "connected"
      ? "green"
      : normalized.includes("eligible") || normalized.includes("processing")
        ? "blue"
        : normalized.includes("hold") || normalized.includes("need") || normalized.includes("pending")
          ? "amber"
          : normalized.includes("fail") || normalized.includes("cancel")
            ? "red"
            : "slate";

  return <Badge tone={tone}>{status}</Badge>;
}
