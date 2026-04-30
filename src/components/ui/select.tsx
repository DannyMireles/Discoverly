import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "min-h-12 w-full rounded-full border border-white/70 bg-white/85 px-5 py-2.5 text-sm font-medium text-[#171912] outline-none transition-all duration-200 ease-out hover:bg-white/95 focus:border-white focus:bg-white focus:shadow-[0_0_0_4px_rgba(216,221,184,0.55)] focus:ring-0",
        className,
      )}
      {...props}
    />
  );
}
