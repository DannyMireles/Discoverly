import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-12 w-full rounded-full border border-white/70 bg-white/85 px-5 py-2.5 text-sm font-medium text-[#171912] outline-none transition-all duration-200 ease-out placeholder:text-[#6a6f62] hover:bg-white/95 focus:border-white focus:bg-white focus:shadow-[0_0_0_4px_rgba(216,221,184,0.55)] focus:ring-0",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-[1.5rem] border border-white/70 bg-white/85 px-5 py-4 text-sm font-medium text-[#171912] outline-none transition-all duration-200 ease-out placeholder:text-[#6a6f62] hover:bg-white/95 focus:border-white focus:bg-white focus:shadow-[0_0_0_4px_rgba(216,221,184,0.55)] focus:ring-0",
        className,
      )}
      {...props}
    />
  );
}
