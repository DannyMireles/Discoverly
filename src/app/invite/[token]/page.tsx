import Link from "next/link";
import { AcceptInviteButton } from "@/components/affiliate/accept-invite-button";
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
        .select("name, email, affiliate_promotions(public_code)")
        .eq("invite_token", token)
        .maybeSingle()
        .then((result) => result.data)
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-xl">
        <CardHeader><CardTitle>Accept Zenful Cove Invite</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {!configured ? (
            <Banner title="Supabase is not configured" tone="warning">Add Supabase environment variables before accepting invites.</Banner>
          ) : !affiliate ? (
            <Banner title="Invite not found" tone="warning">This token is invalid or has already been accepted.</Banner>
          ) : (
            <>
              <p className="text-sm text-slate-600">You were invited as {affiliate.name}. Sign in first, then accept the invite.</p>
              <CopyField label="Your code" value={affiliate.affiliate_promotions?.[0]?.public_code ?? "Pending"} />
              <CopyField label="Invite token" value={token} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Link href="/auth"><Button variant="secondary" className="w-full">Sign in / create account</Button></Link>
                <AcceptInviteButton inviteToken={token} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
