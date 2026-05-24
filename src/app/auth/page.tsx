import { AuthForm } from "@/components/auth/auth-form";
import { Banner } from "@/components/ui/banner";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="auth-scene flex min-h-screen items-center justify-center p-6">
      <div className="auth-scene-content w-full max-w-lg space-y-6">
        {!isSupabaseConfigured() && (
          <Banner title="Sign in is temporarily unavailable" tone="warning">
            Please try again shortly or contact support if this continues.
          </Banner>
        )}
        <AuthForm redirectTo={params.redirectTo} />
      </div>
    </main>
  );
}
