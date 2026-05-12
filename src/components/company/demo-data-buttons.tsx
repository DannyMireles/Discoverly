"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Wrench } from "lucide-react";

export function DemoDataButtons({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<null | "seed" | "seed-and-link" | "clear">(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: "seed" | "clear", linkAffiliateToMe = false) {
    const key = action === "seed" ? (linkAffiliateToMe ? "seed-and-link" : "seed") : "clear";
    setLoading(key);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/seed-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, action, linkAffiliateToMe }),
      });
      const payload = (await response.json()) as {
        error?: string;
        summary?: Record<string, number>;
        linkedAffiliateId?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Demo action failed.");
      if (action === "seed" && payload.summary) {
        const parts = Object.entries(payload.summary).map(([k, v]) => `${v} ${k}`);
        const linkedNote = payload.linkedAffiliateId ? " — linked to Demo Marina." : "";
        setMessage(`Seeded ${parts.join(", ")}.${linkedNote}`);
      } else {
        setMessage("Demo data cleared.");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Demo action failed.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-700 backdrop-blur transition hover:bg-white"
      >
        <Wrench className="h-3.5 w-3.5" aria-hidden />
        Dev tools
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-white/60 bg-white/95 p-3 text-xs shadow-xl backdrop-blur">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">Demo data</p>
          <div className="flex flex-col gap-1.5">
            <DevButton onClick={() => void run("seed", false)} disabled={loading !== null} loading={loading === "seed"}>
              Seed demo data
            </DevButton>
            <DevButton
              onClick={() => void run("seed", true)}
              disabled={loading !== null}
              loading={loading === "seed-and-link"}
            >
              Seed + view as affiliate
            </DevButton>
            <DevButton
              onClick={() => void run("clear")}
              disabled={loading !== null}
              loading={loading === "clear"}
              variant="danger"
            >
              Clear demo data
            </DevButton>
          </div>
          {message ? <p className="mt-2 break-words text-[11px] text-slate-600">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function DevButton({
  children,
  onClick,
  disabled,
  loading,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition ${
        variant === "danger"
          ? "bg-red-50 text-red-700 hover:bg-red-100"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      } disabled:opacity-50`}
    >
      {loading ? "Running..." : children}
    </button>
  );
}
