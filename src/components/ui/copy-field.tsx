"use client";

import { Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";

export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div>
      <label className="text-xs font-medium uppercase text-slate-500">{label}</label>
      <div className="mt-1 flex min-w-0 items-center gap-2 rounded-md border border-border bg-slate-50 p-2">
        <code className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{value}</code>
        <Button type="button" variant="secondary" className="h-8 min-h-8 px-2" onClick={copyValue}>
          <Copy className="h-4 w-4" aria-hidden />
          <span className="sr-only">Copy</span>
        </Button>
      </div>
      {copied ? <p className="mt-1 text-xs text-emerald-700">Copied</p> : null}
    </div>
  );
}
