"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ResendInviteButton({ affiliateId, alreadyAccepted }: { affiliateId: string; alreadyAccepted: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setState("sending");
    setError(null);
    try {
      const response = await fetch(`/api/affiliates/${affiliateId}/invite`, { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to send invite.");
      setState("sent");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to send invite.");
    }
  }

  if (alreadyAccepted) {
    return (
      <Button variant="secondary" disabled>
        Invite Accepted
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="secondary" onClick={() => void send()} disabled={state === "sending"}>
        <Send className="h-4 w-4" aria-hidden />
        {state === "sending" ? "Sending..." : state === "sent" ? "Invite Sent" : "Resend Invite"}
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
