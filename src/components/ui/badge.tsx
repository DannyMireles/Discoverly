import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type BadgeTone = "slate" | "blue" | "green" | "amber" | "red";

export function Badge({
  className,
  tone = "slate",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold transition-colors duration-150",
        tone === "slate" && "border-white/70 bg-white/80 text-[#3a3f37]",
        tone === "blue" && "border-[#b8c5d4] bg-[#dde8ec]/90 text-[#2c5468]",
        tone === "green" && "border-[#b8d3a8] bg-[#dceacb]/90 text-[#356f37]",
        tone === "amber" && "border-[#dbc888] bg-[#ecdfae]/90 text-[#665218]",
        tone === "red" && "border-[#d9aa9f] bg-[#ebccc4]/90 text-[#7e362c]",
        className,
      )}
      {...props}
    />
  );
}
