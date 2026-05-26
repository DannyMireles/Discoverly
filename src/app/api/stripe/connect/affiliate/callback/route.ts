import { NextResponse } from "next/server";
import { z } from "zod";
import { errorMetadata, logOperationalEvent } from "@/lib/ops/events";
import { createStripeClient, isAffiliateConnectAccountReady } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const paramsSchema = z.object({
  affiliateId: z.string().uuid(),
  returnPath: z.string().startsWith("/").optional(),
});

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const parsed = paramsSchema.safeParse({
    affiliateId: searchParams.get("affiliateId"),
    returnPath: searchParams.get("returnPath") ?? undefined,
  });

  const fallback = `${origin}/affiliate/dashboard`;
  if (!parsed.success) {
    return NextResponse.redirect(`${fallback}?stripe=error`);
  }

  const returnUrl = `${origin}${parsed.data.returnPath ?? "/affiliate/dashboard"}`;
  const admin = createSupabaseAdminClient();

  const { data: affiliate } = await admin
    .from("affiliates")
    .select("id, company_id, stripe_account_id")
    .eq("id", parsed.data.affiliateId)
    .maybeSingle();

  if (!affiliate?.stripe_account_id) {
    await logOperationalEvent({
      affiliateId: parsed.data.affiliateId,
      source: "stripe_connect",
      event: "affiliate_callback_missing_account",
      level: "warn",
      message: "Affiliate Stripe callback did not find a Stripe account ID.",
    });
    return NextResponse.redirect(`${returnUrl}?stripe=error`);
  }

  try {
    const stripe = createStripeClient();
    const account = await stripe.accounts.retrieve(affiliate.stripe_account_id);

    const payoutsEnabled = Boolean(account.payouts_enabled);
    const fullyOnboarded = isAffiliateConnectAccountReady(account);

    await admin
      .from("affiliates")
      .update({
        stripe_connected: fullyOnboarded,
        stripe_payouts_enabled: payoutsEnabled,
      })
      .eq("id", affiliate.id);

    await logOperationalEvent({
      companyId: affiliate.company_id as string,
      affiliateId: affiliate.id as string,
      source: "stripe_connect",
      event: "affiliate_callback_completed",
      message: "Affiliate Stripe callback refreshed account status.",
      metadata: {
        accountId: affiliate.stripe_account_id,
        payoutsEnabled,
        transfersCapability: account.capabilities?.transfers ?? null,
        fullyOnboarded,
      },
    });

    return NextResponse.redirect(
      `${returnUrl}?stripe=${fullyOnboarded ? "connected" : "incomplete"}`,
    );
  } catch (error) {
    await logOperationalEvent({
      companyId: affiliate.company_id as string,
      affiliateId: affiliate.id as string,
      source: "stripe_connect",
      event: "affiliate_callback_failed",
      level: "error",
      message: "Affiliate Stripe callback failed.",
      metadata: errorMetadata(error),
    });
    return NextResponse.redirect(`${returnUrl}?stripe=error`);
  }
}
