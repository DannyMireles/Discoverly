import { VerifyOtpForm } from "@/components/auth/verify-otp-form";
import { Banner } from "@/components/ui/banner";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function AuthVerifyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg space-y-6">
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
