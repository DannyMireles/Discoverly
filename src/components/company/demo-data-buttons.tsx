"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Database, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DemoDataButtons({ companyId }: { companyId: string }) {
  const router = useRouter();
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
      const payload = (await response.json()) as { error?: string; summary?: Record<string, number>; linkedAffiliateId?: string };
      if (!response.ok) throw new Error(payload.error ?? "Demo action failed.");
      if (action === "seed" && payload.summary) {
        const parts = Object.entries(payload.summary).map(([k, v]) => `${v} ${k}`);
        const linkedNote = payload.linkedAffiliateId ? " — your account is now linked to Demo Marina." : "";
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
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondary" onClick={() => void run("seed", false)} disabled={loading !== null}>
        <Database className="h-4 w-4" aria-hidden />
        {loading === "seed" ? "Seeding..." : "Seed demo data"}
      </Button>
      <Button type="button" variant="secondary" onClick={() => void run("seed", true)} disabled={loading !== null}>
        <Sparkles className="h-4 w-4" aria-hidden />
        {loading === "seed-and-link" ? "Seeding..." : "Seed + view as affiliate"}
      </Button>
      <Button type="button" variant="secondary" onClick={() => void run("clear")} disabled={loading !== null}>
        <Trash2 className="h-4 w-4" aria-hidden />
        {loading === "clear" ? "Clearing..." : "Clear demo data"}
      </Button>
      {message ? <span className="text-xs text-slate-600">{message}</span> : null}
    </div>
  );
}
