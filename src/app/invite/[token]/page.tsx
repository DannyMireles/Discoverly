import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyField } from "@/components/ui/copy-field";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const configured = isSupabaseAdminConfigured();
  const affiliate = configured
    ? await createSupabaseAdminClient()
        .from("affiliates")
        .select(
          "name, email, invite_accepted_at, companies(name), affiliate_promotions(public_code)",
        )
        .eq("invite_token", token)
        .maybeSingle()
        .then((result) => result.data as
          | { name: string; email: string; invite_accepted_at: string | null; companies: { name: string } | null; affiliate_promotions: Array<{ public_code: string }> }
          | null)
    : null;

  const companyName = affiliate?.companies?.name ?? "Your host";
  const alreadyAccepted = Boolean(affiliate?.invite_accepted_at);

  return (
    <AppShell title={`Accept ${companyName} invite`} description="Create your affiliate account." hideNav>
      <div className="mx-auto w-full max-w-xl space-y-5">
        {!configured ? (
          <Banner title="Invites are temporarily unavailable" tone="warning">
            Please try again shortly or contact your host if this continues.
          </Banner>
        ) : !affiliate ? (
          <Banner title="Invite not found" tone="warning">
            This token is invalid or has been revoked. Reach out to your host for a fresh invite link.
          </Banner>
        ) : alreadyAccepted ? (
          <Card>
            <CardHeader>
              <CardTitle>Invite already accepted</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-[#3e4240]">
                This invite has already been claimed. Sign in to continue.
              </p>
              <Link href="/auth">
                <Button>Go to sign in</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>You&apos;re invited to {companyName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-[#3e4240]">
                  Hi {affiliate.name} — confirm your details below and we&apos;ll email you a sign-in code. Once you
                  enter the code, your affiliate account is activated automatically.
                </p>
                <CopyField
                  label="Your promo code"
                  value={affiliate.affiliate_promotions?.[0]?.public_code ?? "Pending"}
                />
              </CardContent>
            </Card>
            <AuthForm
              inviteToken={token}
              lockedEmail={affiliate.email}
              initialName={affiliate.name}
            />
          </>
        )}
      </div>
    </AppShell>
  );
}
