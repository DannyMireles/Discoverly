"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";
import { PERIOD_OPTIONS, type PeriodKey } from "@/lib/company/filters";

export function AffiliateFilters({ period }: { period: PeriodKey }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setPeriod(value: PeriodKey) {
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    if (value === "180d") next.delete("period");
    else next.set("period", value);
    const query = next.toString();
    router.push(query ? `?${query}` : "?", { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/60 bg-white/60 p-2 backdrop-blur">
      <label className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white/85 pl-3 pr-1 text-xs font-medium text-slate-700 shadow-sm">
        <Calendar className="h-3.5 w-3.5" aria-hidden />
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as PeriodKey)}
          className="cursor-pointer rounded-full bg-transparent py-1.5 pr-2 text-xs font-medium text-slate-800 outline-none"
        >
          {PERIOD_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
