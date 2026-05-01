/** Publishable key (`sb_publishable_...`). Falls back to legacy anon JWT. */
export function getSupabasePublishableKey(): string | undefined {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return key || undefined;
}

/** Secret key (`sb_secret_...`). Falls back to legacy service_role JWT. */
export function getSupabaseSecretKey(): string | undefined {
  const key =
    process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return key || undefined;
}

export function requireSupabasePublishableKey(): string {
  const key = getSupabasePublishableKey();
  if (!key) {
    throw new Error(
      "Missing Supabase publishable key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or legacy NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }
  return key;
}

export function requireSupabaseSecretKey(): string {
  const key = getSupabaseSecretKey();
  if (!key) {
    throw new Error(
      "Missing Supabase secret key. Set SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  return key;
}

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabasePublishableKey());
}

export function isSupabaseAdminConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      getSupabasePublishableKey() &&
      getSupabaseSecretKey(),
  );
}
