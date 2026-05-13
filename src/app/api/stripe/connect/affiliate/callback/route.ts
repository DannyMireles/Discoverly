import { NextResponse } from "next/server";
import { z } from "zod";
import { createStripeClient } from "@/lib/stripe";
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
    .select("id, stripe_account_id")
    .eq("id", parsed.data.affiliateId)
    .maybeSingle();

  if (!affiliate?.stripe_account_id) {
    return NextResponse.redirect(`${returnUrl}?stripe=error`);
  }

  try {
    const stripe = createStripeClient();
    const account = await stripe.accounts.retrieve(affiliate.stripe_account_id);

    const payoutsEnabled = Boolean(account.payouts_enabled);
    const fullyOnboarded =
      Boolean(account.details_submitted) &&
      payoutsEnabled &&
      Boolean(account.charges_enabled ?? true);

    await admin
      .from("affiliates")
      .update({
        stripe_connected: fullyOnboarded,
        stripe_payouts_enabled: payoutsEnabled,
      })
      .eq("id", affiliate.id);

    return NextResponse.redirect(
      `${returnUrl}?stripe=${fullyOnboarded ? "connected" : "incomplete"}`,
    );
  } catch {
    return NextResponse.redirect(`${returnUrl}?stripe=error`);
  }
}
