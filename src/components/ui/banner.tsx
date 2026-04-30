import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type BannerTone = "info" | "warning" | "success";

export function Banner({
  title,
  children,
  tone = "info",
  action,
}: {
  title: string;
  children: ReactNode;
  tone?: BannerTone;
  action?: ReactNode;
}) {
  const Icon = tone === "warning" ? AlertTriangle : tone === "success" ? CheckCircle2 : Info;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-[1.75rem] border p-5 shadow-[0_14px_36px_rgba(23,31,31,0.10)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between",
        tone === "info" && "border-white/60 bg-[#eaf0e0]/95 text-[#20251f]",
        tone === "warning" && "border-[#e7d9a9]/80 bg-[#f3e9c5]/95 text-[#3a321e]",
        tone === "success" && "border-[#cadfb8]/80 bg-[#e7f1de]/95 text-[#20341f]",
      )}
    >
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div>
          <div className="font-semibold">{title}</div>
          <div className="mt-1 text-sm leading-6 opacity-85">{children}</div>
        </div>
      </div>
      {action}
    </div>
  );
}
