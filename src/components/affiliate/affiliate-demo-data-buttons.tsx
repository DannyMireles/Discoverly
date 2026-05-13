"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Database, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AffiliateDemoDataButtons() {
  const router = useRouter();
  const [loading, setLoading] = useState<null | "seed" | "clear">(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: "seed" | "clear") {
    setLoading(action);
    setMessage(null);
    try {
      const response = await fetch("/api/affiliate/seed-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as {
        error?: string;
        summary?: Record<string, number>;
      };
      if (!response.ok) throw new Error(payload.error ?? "Demo data action failed.");

      if (action === "seed" && payload.summary) {
        const bookings = payload.summary.bookings ?? 0;
        const commissions = payload.summary.commissions ?? 0;
        setMessage(`Seeded ${bookings} bookings and ${commissions} commissions.`);
      } else {
        setMessage("Affiliate demo data cleared.");
      }

      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Demo data action failed.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={() => void run("seed")}
        disabled={loading !== null}
        className="min-h-10 px-4 py-1.5 text-xs"
      >
        <Database className="h-3.5 w-3.5" aria-hidden />
        {loading === "seed" ? "Seeding..." : "Seed demo data"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => void run("clear")}
        disabled={loading !== null}
        className="min-h-10 px-4 py-1.5 text-xs text-[#8b362e] hover:bg-white/75"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        {loading === "clear" ? "Clearing..." : "Clear demo data"}
      </Button>
      {message ? <p className="w-full text-right text-[11px] font-medium text-slate-600">{message}</p> : null}
    </div>
  );
}
