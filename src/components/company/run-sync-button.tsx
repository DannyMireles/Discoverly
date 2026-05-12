"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Result =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; synced: number; matched: number }
  | { type: "error"; message: string };

export function RunSyncButton({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [result, setResult] = useState<Result>({ type: "idle" });

  async function run() {
    setResult({ type: "loading" });
    try {
      const response = await fetch("/api/lodgify/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        synced?: number;
        results?: Array<{ matched?: boolean }>;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Lodgify sync failed.");
      const matched = (payload.results ?? []).filter((row) => row.matched).length;
      setResult({ type: "success", synced: payload.synced ?? 0, matched });
      router.refresh();
    } catch (error) {
      setResult({ type: "error", message: error instanceof Error ? error.message : "Lodgify sync failed." });
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" onClick={() => void run()} disabled={result.type === "loading"}>
        <RefreshCw className={`h-4 w-4 ${result.type === "loading" ? "animate-spin" : ""}`} aria-hidden />
        {result.type === "loading" ? "Syncing..." : "Run Sync Now"}
      </Button>
      {result.type === "success" ? (
        <p className="text-xs text-emerald-700">
          Synced {result.synced} {result.synced === 1 ? "booking" : "bookings"} · {result.matched} matched to affiliates.
        </p>
      ) : null}
      {result.type === "error" ? (
        <p className="max-w-md text-right text-xs text-red-600 break-words">{result.message}</p>
      ) : null}
    </div>
  );
}
