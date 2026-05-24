import { VerifyOtpForm } from "@/components/auth/verify-otp-form";
import { Banner } from "@/components/ui/banner";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function AuthVerifyPage() {
  return (
    <main className="auth-scene flex min-h-screen items-center justify-center p-6">
      <div className="auth-scene-content w-full max-w-lg space-y-6">
        {!isSupabaseConfigured() && (
          <Banner title="Verification is temporarily unavailable" tone="warning">
            Please try again shortly or contact support if this continues.
          </Banner>
        )}
        <VerifyOtpForm />
      </div>
    </main>
  );
}
