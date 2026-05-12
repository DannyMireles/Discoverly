"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy-field";
import { Input } from "@/components/ui/input";
import { Banner } from "@/components/ui/banner";

export function RotatePromotionPanel({
  affiliateId,
  currentPublicCode,
  currentLodgifyPromotionName,
}: {
  affiliateId: string;
  currentPublicCode: string;
  currentLodgifyPromotionName: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [publicCode, setPublicCode] = useState(currentPublicCode);
  const [lodgifyName, setLodgifyName] = useState(currentLodgifyPromotionName);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function submit() {
    setMessage(null);
    if (!window.confirm(
      "Rotate this promotion?\n\nThe current promotion will be expired so historical bookings keep their attribution. A new active promotion will be created with the values you entered. You'll need to update the matching promotion in Lodgify to the new name.",
    )) {
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/affiliates/${affiliateId}/rotate-promotion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicCode, lodgifyPromotionName: lodgifyName }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Rotation failed.");
      setMessage({
        tone: "success",
        text: "Promotion rotated. The previous promotion was expired and historical commissions are preserved.",
      });
      setEditing(false);
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Rotation failed." });
    } finally {
      setSubmitting(false);
    }
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        <CopyField label="Public code" value={currentPublicCode} />
        <CopyField label="Lodgify promotion name" value={currentLodgifyPromotionName} />
        <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
          <RefreshCcw className="h-4 w-4" aria-hidden />
          Rotate promotion code
        </Button>
        {message ? (
          <p className={`text-xs ${message.tone === "success" ? "text-emerald-700" : "text-red-600"}`}>
            {message.text}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Banner title="Heads up" tone="warning">
        Rotating archives the current promotion so historical bookings stay attributed, and creates a new active one
        with the values below. You must also update the matching promotion in Lodgify so future bookings carry the new
        name.
      </Banner>
      <div>
        <label className="text-sm font-medium text-slate-700">New public code</label>
        <Input value={publicCode} onChange={(e) => setPublicCode(e.target.value.toUpperCase())} />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">New Lodgify promotion name</label>
        <Input value={lodgifyName} onChange={(e) => setLodgifyName(e.target.value)} />
      </div>
      {message?.tone === "error" ? <p className="text-xs text-red-600">{message.text}</p> : null}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" onClick={() => void submit()} disabled={submitting}>
          {submitting ? "Rotating..." : "Rotate and Activate"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setEditing(false);
            setPublicCode(currentPublicCode);
            setLodgifyName(currentLodgifyPromotionName);
            setMessage(null);
          }}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
