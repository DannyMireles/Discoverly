import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createAccountLink, createAffiliateConnectAccount } from "@/lib/stripe";

const requestSchema = z.object({
  affiliateId: z.string().uuid(),
  email: z.string().email(),
  returnUrl: z.string().url(),
  refreshUrl: z.string().url(),
});

export async function POST(request: Request) {
  const { user, response: authError } = await requireUser();
  if (authError) return authError;

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Stripe Connect request." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: affiliate } = await admin
    .from("affiliates")
    .select("id, company_id, user_id, stripe_account_id")
    .eq("id", parsed.data.affiliateId)
    .maybeSingle();

  if (!affiliate) {
    return NextResponse.json({ error: "Affiliate not found." }, { status: 404 });
  }

  if (affiliate.user_id !== user!.id) {
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
  }

  try {
    const accountId =
      affiliate.stripe_account_id ?? (await createAffiliateConnectAccount(parsed.data.email)).id;

    if (!affiliate.stripe_account_id) {
      const { error: updateError } = await admin
        .from("affiliates")
        .update({ stripe_account_id: accountId })
        .eq("id", affiliate.id);
      if (updateError) throw new Error(updateError.message);
    }

    const accountLink = await createAccountLink(
      accountId,
      parsed.data.refreshUrl,
      parsed.data.returnUrl,
    );

    return NextResponse.json({
      affiliateId: parsed.data.affiliateId,
      accountId,
      url: accountLink.url,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe Connect setup failed." },
      { status: 500 },
    );
  }
}
