"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const inputClass =
  "min-h-12 w-full rounded-full border border-white/70 bg-white/85 py-2.5 pl-5 pr-12 text-sm font-medium text-[#171912] outline-none transition-all duration-200 ease-out placeholder:text-[#6a6f62] hover:bg-white/95 focus:border-white focus:bg-white focus:shadow-[0_0_0_4px_rgba(216,221,184,0.55)] focus:ring-0";

type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** When false (default), value is masked until the user toggles visibility. */
  defaultVisible?: boolean;
};

/** Masked input by default; eye button reveals plain text (passwords, API keys, codes). */
export function PasswordInput({ className, id, defaultVisible = false, ...props }: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(defaultVisible);

  return (
    <div className="relative">
      <input
        id={inputId}
        type={visible ? "text" : "password"}
        className={cn(inputClass, className)}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#525a48] transition-colors hover:bg-white/80 hover:text-[#171912]"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide value" : "Show value"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
}
