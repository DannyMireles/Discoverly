import { VerifyOtpForm } from "@/components/auth/verify-otp-form";
import { Banner } from "@/components/ui/banner";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function AuthVerifyPage() {
  return (
    <main className="auth-scene flex min-h-screen items-center justify-center p-6">
      <div className="auth-scene-content w-full max-w-lg space-y-6">
        {!isSupabaseConfigured() && (
          <Banner title="Supabase is not configured" tone="warning">
            Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to{" "}
            <code>.env.local</code>, then restart the dev server.
          </Banner>
        )}
        <VerifyOtpForm />
      </div>
    </main>
  );
}
