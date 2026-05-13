"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AcceptInviteButton({ inviteToken }: { inviteToken: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function acceptInvite() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not accept invite.");
      router.push("/affiliate/dashboard?invite=accepted");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not accept invite.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button className="w-full" type="button" onClick={acceptInvite} disabled={loading}>
        {loading ? "Accepting..." : "Accept Invite"}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
      {message ? <p className="text-sm text-red-600">{message}</p> : null}
    </div>
  );
}
