import type { HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type TableProps = HTMLAttributes<HTMLTableElement> & {
  /** When set, wraps the table in a scrollable container of this max height. Default ~480px. */
  maxHeight?: number | "none";
};

export function Table({ className, maxHeight = 480, ...props }: TableProps) {
  const constrain = maxHeight !== "none";
  return (
    <div
      className="w-full overflow-auto"
      style={constrain ? { maxHeight: typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight } : undefined}
    >
      <table className={cn("w-full min-w-[760px] text-left text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "sticky top-0 z-10 border-b border-white/60 bg-white/85 text-xs uppercase tracking-[0.12em] text-[#4f5847] backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}

export function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-white/55", className)} {...props} />;
}

export function TR({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("align-middle transition-colors duration-150 ease-out hover:bg-white/55", className)} {...props} />;
}

export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-5 py-3.5 font-semibold", className)} {...props} />;
}

export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-5 py-4 text-[#1f221c]", className)} {...props} />;
}
