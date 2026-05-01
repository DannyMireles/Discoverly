"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import type { CurrentCompany } from "@/lib/company/current";

const NEXT_STEP_HREF = "/company/settings/stripe";

export function LodgifySettingsForm({ company }: { company: CurrentCompany }) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "testing" | "success" | "error">("idle");
  const [keySaved, setKeySaved] = useState(Boolean(company.lodgify_connected));
  const [message, setMessage] = useState(
    company.lodgify_connected
      ? "Lodgify key already saved. Test it or continue to the next step."
      : "No key saved in this browser session.",
  );

  async function saveKey() {
    if (!apiKey) {
      setStatus("error");
      setMessage("Paste a Lodgify API key before saving.");
      return;
    }

    setStatus("saving");
    try {
      const response = await fetch("/api/company/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id, lodgifyApiKey: apiKey }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not save Lodgify key.");
      setMessage("Lodgify API key saved securely.");
      setStatus("success");
      setKeySaved(true);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not save Lodgify key.");
    }
  }

  async function testConnection() {
    if (!apiKey) {
      setStatus("error");
      setMessage("Paste a Lodgify API key before testing.");
      return;
    }

    setStatus("testing");
    try {
      const response = await fetch("/api/lodgify/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Lodgify connection failed.");
      }
      setStatus("success");
      setMessage("Lodgify connection test succeeded.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Lodgify connection failed.");
    }
  }

  return (
    <div className="space-y-6">
      <Banner title="Your Lodgify key stays private." tone="info">
        Discoverly stores your key encrypted and never shows it again. Use Test Connection to confirm Lodgify accepts the key, then Save to keep it.
      </Banner>
      <Card>
        <CardHeader><CardTitle>API Key</CardTitle></CardHeader>
        <CardContent className="max-w-2xl space-y-5">
          <PasswordInput
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="Paste Lodgify API key"
            autoComplete="off"
          />
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={saveKey} variant="secondary" disabled={status === "saving"}>
              Save Key
            </Button>
            <Button type="button" onClick={testConnection} disabled={status === "testing"}>
              {status === "testing" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Test Connection
            </Button>
            <Button type="button" variant="secondary" disabled={!apiKey}>
              Sync Properties
            </Button>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {status === "success" ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : null}
            <span>{message}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border/60 pt-4">
            <p className="text-xs text-slate-500">
              {keySaved
                ? "Lodgify is connected. Continue to Stripe to enable affiliate payouts."
                : "Save your Lodgify key to unlock the next step."}
            </p>
            <Button
              type="button"
              onClick={() => router.push(NEXT_STEP_HREF)}
              disabled={!keySaved}
            >
              Next: Connect Stripe
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
