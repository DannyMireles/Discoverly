import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "group/card overflow-hidden rounded-[2rem] border border-white/60 bg-[#f6f6ec]/95 text-card-foreground shadow-[0_18px_48px_rgba(23,31,31,0.10)] backdrop-blur-xl transition duration-300 ease-out hover:-translate-y-0.5 hover:border-white/80 hover:shadow-[0_28px_70px_rgba(23,31,31,0.16),0_0_0_1px_rgba(255,255,255,0.55)_inset]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1.5 p-7 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-xl font-semibold tracking-[-0.02em] text-[#17151f]", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-6 text-[#4a4f48]", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-7 pt-4", className)} {...props} />;
}
