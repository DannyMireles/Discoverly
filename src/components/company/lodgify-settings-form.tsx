"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CurrentCompany } from "@/lib/company/current";

export function LodgifySettingsForm({ company }: { company: CurrentCompany }) {
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "testing" | "success" | "error">("idle");
  const [message, setMessage] = useState("No key saved in this browser session.");

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
      setMessage("Lodgify API key saved encrypted in Supabase.");
      setStatus("success");
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
      <Banner title="Lodgify API keys are never exposed to the public app." tone="warning">
        Test Connection calls `/api/lodgify/test`. Save Key stores the key encrypted in the `companies` table.
      </Banner>
      <Card>
        <CardHeader><CardTitle>API Key</CardTitle></CardHeader>
        <CardContent className="max-w-2xl space-y-5">
          <Input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="Paste Lodgify API key"
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
        </CardContent>
      </Card>
    </div>
  );
}
