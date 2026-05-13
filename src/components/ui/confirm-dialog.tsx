"use client";

import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ConfirmTone = "danger" | "warning" | "default";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  const iconColor =
    tone === "danger" ? "text-[#9f4138]" : tone === "warning" ? "text-amber-600" : "text-slate-600";
  const ring =
    tone === "danger"
      ? "bg-[#fbe7e3] ring-[#9f4138]/20"
      : tone === "warning"
        ? "bg-amber-50 ring-amber-500/20"
        : "bg-slate-100 ring-slate-300/30";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <button
        type="button"
        aria-label="Close confirmation"
        onClick={() => !loading && onCancel()}
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/60 bg-[#f6f6ec]/95 text-card-foreground shadow-[0_28px_70px_rgba(23,31,31,0.18)] backdrop-blur-xl">
        <div className="flex items-start gap-4 px-7 pt-7">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-4 ${ring}`}>
            <AlertTriangle className={`h-5 w-5 ${iconColor}`} aria-hidden />
          </div>
          <div className="flex-1">
            <h2 id="confirm-dialog-title" className="text-lg font-semibold tracking-tight text-[#17151f]">
              {title}
            </h2>
            <div className="mt-2 whitespace-pre-line text-sm leading-6 text-[#4a4f48]">{description}</div>
          </div>
          <button
            type="button"
            onClick={() => !loading && onCancel()}
            className="rounded-full p-1.5 text-slate-500 transition hover:bg-white/70 hover:text-slate-900"
            aria-label="Close"
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 px-7 pb-6 pt-5">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? `${confirmLabel}…` : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
