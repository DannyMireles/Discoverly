import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-primary/25 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "bg-[#11101f] text-white shadow-[0_14px_34px_rgba(17,16,31,0.20)] hover:-translate-y-0.5 hover:bg-[#242139] hover:shadow-[0_20px_44px_rgba(17,16,31,0.32)]",
        variant === "secondary" && "border border-white/60 bg-white/75 text-[#1f2024] shadow-[0_10px_28px_rgba(22,21,36,0.08)] backdrop-blur hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_38px_rgba(22,21,36,0.14)]",
        variant === "ghost" && "text-[#23271f] hover:bg-white/70",
        variant === "danger" && "bg-[#9f4138] text-white shadow-[0_14px_34px_rgba(159,65,56,0.25)] hover:-translate-y-0.5 hover:bg-[#8b362e] hover:shadow-[0_20px_44px_rgba(159,65,56,0.35)]",
        className,
      )}
      {...props}
    />
  );
}
