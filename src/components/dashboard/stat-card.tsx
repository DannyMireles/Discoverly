import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export function StatCard({
  label,
  value,
  detail,
  icon,
  tone = "blue",
}: {
  label: string;
  value: string;
  detail?: string;
  icon?: ReactNode;
  tone?: "blue" | "green" | "amber" | "slate";
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-5 p-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#525a48]">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#11101e]">{value}</p>
          {detail ? <p className="mt-1 text-sm text-[#525a48]">{detail}</p> : null}
        </div>
        {icon ? (
          <div
            className={cn(
              "rounded-full bg-white p-3 shadow-[0_10px_26px_rgba(23,31,31,0.12)] transition-transform duration-300 ease-out group-hover/card:scale-105",
              tone === "blue" && "text-[#4a55d4]",
              tone === "green" && "text-[#3f8147]",
              tone === "amber" && "text-[#7e6620]",
              tone === "slate" && "text-[#3d4239]",
            )}
          >
            {icon}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
