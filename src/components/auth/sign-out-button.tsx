"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function signOut() {
    setLoading(true);
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push("/auth");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign out.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="danger" className={className} onClick={() => void signOut()} disabled={loading}>
        <LogOut className="h-4 w-4" aria-hidden />
        {loading ? "Signing out..." : "Sign Out"}
      </Button>
      {message ? <p className="text-sm text-red-600">{message}</p> : null}
    </div>
  );
}
