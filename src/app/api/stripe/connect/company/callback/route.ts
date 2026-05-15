import { NextResponse } from "next/server";
import { errorMetadata, logOperationalEvent } from "@/lib/ops/events";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { retrieveConnectAccount } from "@/lib/stripe";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const settingsUrl = `${origin}/company/settings/stripe`;

  if (error || !companyId) {
    const msg = errorDescription ?? error ?? "missing_company";
    if (companyId) {
      await logOperationalEvent({
        companyId,
        source: "stripe_connect",
        event: "company_onboarding_rejected",
        level: "warn",
        message: "Company Stripe onboarding callback returned an error.",
        metadata: { stripeError: msg },
      });
    }
    return NextResponse.redirect(`${settingsUrl}?error=${encodeURIComponent(msg)}`);
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data: company, error: companyError } = await admin
      .from("companies")
      .select("id, stripe_account_id")
      .eq("id", companyId)
      .single();

    if (companyError) throw new Error(companyError.message);
    if (!company.stripe_account_id) throw new Error("stripe_account_missing");

    const account = await retrieveConnectAccount(company.stripe_account_id as string);
    const fullyOnboarded =
      Boolean(account.details_submitted) &&
      Boolean(account.payouts_enabled) &&
      Boolean(account.charges_enabled ?? true);

    const { error: dbError } = await admin
      .from("companies")
      .update({
        stripe_access_token_encrypted: null,
        stripe_connected: fullyOnboarded,
      })
      .eq("id", companyId);

    if (dbError) throw new Error(dbError.message);

    await logOperationalEvent({
      companyId,
      source: "stripe_connect",
      event: fullyOnboarded ? "company_onboarding_completed" : "company_onboarding_incomplete",
      level: fullyOnboarded ? "info" : "warn",
      message: fullyOnboarded
        ? "Company Stripe onboarding completed."
        : "Company Stripe onboarding returned before the account was fully ready.",
      metadata: {
        stripeAccountId: account.id,
        detailsSubmitted: Boolean(account.details_submitted),
        payoutsEnabled: Boolean(account.payouts_enabled),
        chargesEnabled: Boolean(account.charges_enabled ?? true),
      },
    });

    return NextResponse.redirect(
      fullyOnboarded ? `${settingsUrl}?connected=true` : `${settingsUrl}?incomplete=true`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "stripe_onboarding_failed";
    await logOperationalEvent({
      companyId,
      source: "stripe_connect",
      event: "company_onboarding_failed",
      level: "error",
      message: "Company Stripe onboarding callback failed.",
      metadata: errorMetadata(err),
    });
    return NextResponse.redirect(`${settingsUrl}?error=${encodeURIComponent(msg)}`);
  }
}
