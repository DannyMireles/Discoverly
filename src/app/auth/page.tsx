import { AuthForm } from "@/components/auth/auth-form";
import { Banner } from "@/components/ui/banner";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function AuthPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg space-y-6">
        {!isSupabaseConfigured() ? (
          <Banner title="Supabase is not configured" tone="warning">
            Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`, then restart the dev server.
          </Banner>
        ) : null}
        <AuthForm />
      </div>
    </main>
  );
}
