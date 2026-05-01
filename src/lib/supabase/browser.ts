"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublishableKey } from "./env";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = getSupabasePublishableKey();

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return createBrowserClient(url, publishableKey);
}
