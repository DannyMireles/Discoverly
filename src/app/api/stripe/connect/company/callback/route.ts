import { NextResponse } from "next/server";
import { encryptSecret } from "@/lib/crypto/secrets";
import { errorMetadata, logOperationalEvent } from "@/lib/ops/events";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { exchangeStripeOAuthCode } from "@/lib/stripe";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const companyId = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const settingsUrl = `${origin}/company/settings/stripe`;

  if (error || !code || !companyId) {
    const msg = errorDescription ?? error ?? "missing_code";
    if (companyId) {
      await logOperationalEvent({
        companyId,
        source: "stripe_connect",
        event: "company_oauth_rejected",
        level: "warn",
        message: "Company Stripe OAuth callback returned an error.",
        metadata: { stripeError: msg },
      });
    }
    return NextResponse.redirect(`${settingsUrl}?error=${encodeURIComponent(msg)}`);
  }

  try {
    const token = await exchangeStripeOAuthCode(code);

    const admin = createSupabaseAdminClient();
    const { error: dbError } = await admin
      .from("companies")
      .update({
        stripe_account_id: token.stripe_user_id,
        stripe_access_token_encrypted: encryptSecret(token.access_token),
        stripe_connected: true,
      })
      .eq("id", companyId);

    if (dbError) throw new Error(dbError.message);

    await logOperationalEvent({
      companyId,
      source: "stripe_connect",
      event: "company_oauth_completed",
      message: "Company Stripe OAuth completed.",
      metadata: {
        stripeAccountId: token.stripe_user_id,
      },
    });

    return NextResponse.redirect(`${settingsUrl}?connected=true`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "stripe_oauth_failed";
    await logOperationalEvent({
      companyId,
      source: "stripe_connect",
      event: "company_oauth_failed",
      level: "error",
      message: "Company Stripe OAuth callback failed.",
      metadata: errorMetadata(err),
    });
    return NextResponse.redirect(`${settingsUrl}?error=${encodeURIComponent(msg)}`);
  }
}
