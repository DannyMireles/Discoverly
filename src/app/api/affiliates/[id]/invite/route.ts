import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { sendAffiliateInviteEmail } from "@/lib/email/send-invite";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response: authError } = await requireUser();
  if (authError) return authError;

  const { id } = await context.params;

  const admin = createSupabaseAdminClient();
  const { data: affiliate, error: affiliateError } = await admin
    .from("affiliates")
    .select("id, company_id, name, email, invite_token, invite_accepted_at")
    .eq("id", id)
    .maybeSingle();

  if (affiliateError || !affiliate) {
    return NextResponse.json({ error: "Affiliate not found." }, { status: 404 });
  }

  const { data: member } = await admin
    .from("company_users")
    .select("role")
    .eq("company_id", affiliate.company_id)
    .eq("user_id", user!.id)
    .in("role", ["owner", "admin"])
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (affiliate.invite_accepted_at) {
    return NextResponse.json({ error: "Affiliate has already accepted their invite." }, { status: 409 });
  }

  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("name")
    .eq("id", affiliate.company_id)
    .single();
  if (companyError || !company) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  try {
    const result = await sendAffiliateInviteEmail({
      toEmail: affiliate.email as string,
      affiliateName: affiliate.name as string,
      companyName: company.name as string,
      inviteToken: affiliate.invite_token as string,
    });

    await admin
      .from("affiliates")
      .update({ invite_sent_at: new Date().toISOString() })
      .eq("id", affiliate.id);

    return NextResponse.json({ ok: true, emailId: result.id, inviteUrl: result.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send invite.";
    console.error(
      "[invite] failed",
      JSON.stringify({
        affiliateId: affiliate.id,
        to: affiliate.email,
        error: message,
      }),
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
