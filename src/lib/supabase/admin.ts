import { createClient } from "@supabase/supabase-js";
import { requiredEnv } from "./server";
import { requireSupabaseSecretKey } from "./env";

export function createSupabaseAdminClient() {
  return createClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requireSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
