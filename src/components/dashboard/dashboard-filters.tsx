"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Users } from "lucide-react";
import { PERIOD_OPTIONS, type PeriodKey } from "@/lib/company/filters";

export type AffiliateOption = { id: string; name: string };

export function DashboardFilters({
  period,
  affiliateId,
  affiliates,
}: {
  period: PeriodKey;
  affiliateId: string | null;
  affiliates: AffiliateOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    if (!value) next.delete(key);
    else next.set(key, value);
    const query = next.toString();
    router.push(query ? `?${query}` : "?", { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/60 bg-white/60 p-2 backdrop-blur">
      <FilterPill
        icon={<Calendar className="h-3.5 w-3.5" aria-hidden />}
        value={period}
        onChange={(v) => setParam("period", v === "180d" ? null : v)}
        options={PERIOD_OPTIONS.map((p) => ({ value: p.value, label: p.label }))}
      />
      <FilterPill
        icon={<Users className="h-3.5 w-3.5" aria-hidden />}
        value={affiliateId ?? "all"}
        onChange={(v) => setParam("affiliate", v === "all" ? null : v)}
        options={[{ value: "all", label: "All affiliates" }, ...affiliates.map((a) => ({ value: a.id, label: a.name }))]}
      />
    </div>
  );
}

function FilterPill({
  icon,
  value,
  onChange,
  options,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white/85 pl-3 pr-1 text-xs font-medium text-slate-700 shadow-sm">
      {icon}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer rounded-full bg-transparent py-1.5 pr-2 text-xs font-medium text-slate-800 outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
