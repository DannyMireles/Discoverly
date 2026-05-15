import { NextResponse } from "next/server";
import { errorMetadata, logOperationalEvent } from "@/lib/ops/events";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createAccountLink,
  createCompanyConnectAccount,
  retrieveConnectAccount,
} from "@/lib/stripe";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const companyId = searchParams.get("companyId");
  const settingsUrl = new URL("/company/settings/stripe", requestUrl.origin);

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth?redirectTo=/company/settings/stripe", request.url));
  }

  const admin = createSupabaseAdminClient();
  const { data: member, error: memberError } = await admin
    .from("company_users")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"])
    .maybeSingle();

  if (memberError) {
    await logOperationalEvent({
      companyId,
      actorUserId: user.id,
      source: "stripe_connect",
      event: "company_onboarding_member_lookup_failed",
      level: "error",
      message: "Could not verify company Stripe onboarding permissions.",
      metadata: { error: memberError.message },
    });
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  if (!member) {
    await logOperationalEvent({
      companyId,
      actorUserId: user.id,
      source: "stripe_connect",
      event: "company_onboarding_forbidden",
      level: "warn",
      message: "Non-admin attempted to start company Stripe onboarding.",
    });
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const { data: company, error: companyError } = await admin
      .from("companies")
      .select("id, name, stripe_account_id")
      .eq("id", companyId)
      .single();

    if (companyError) throw new Error(companyError.message);

    let accountId = (company.stripe_account_id as string | null) ?? null;

    if (accountId) {
      try {
        await retrieveConnectAccount(accountId);
      } catch (error) {
        await logOperationalEvent({
          companyId,
          actorUserId: user.id,
          source: "stripe_connect",
          event: "company_account_stale",
          level: "warn",
          message: "Stored company Stripe account could not be retrieved and will be replaced.",
          metadata: {
            stripeAccountId: accountId,
            ...errorMetadata(error),
          },
        });
        accountId = null;
      }
    }

    if (!accountId) {
      const account = await createCompanyConnectAccount(user.email, company.name as string | null);
      accountId = account.id;

      const { error: updateError } = await admin
        .from("companies")
        .update({
          stripe_account_id: accountId,
          stripe_access_token_encrypted: null,
          stripe_connected: false,
        })
        .eq("id", companyId);

      if (updateError) throw new Error(updateError.message);

      await logOperationalEvent({
        companyId,
        actorUserId: user.id,
        source: "stripe_connect",
        event: "company_account_created",
        message: "Company Stripe connected account created.",
        metadata: { stripeAccountId: accountId },
      });
    }

    const accountLink = await createAccountLink(
      accountId,
      `${requestUrl.origin}/api/stripe/connect/company?companyId=${companyId}`,
      `${requestUrl.origin}/api/stripe/connect/company/callback?companyId=${companyId}`,
    );

    await logOperationalEvent({
      companyId,
      actorUserId: user.id,
      source: "stripe_connect",
      event: "company_onboarding_link_created",
      message: "Company Stripe onboarding link created.",
      metadata: { stripeAccountId: accountId },
    });

    return NextResponse.redirect(accountLink.url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "stripe_onboarding_failed";
    await logOperationalEvent({
      companyId,
      actorUserId: user.id,
      source: "stripe_connect",
      event: "company_onboarding_link_failed",
      level: "error",
      message: "Company Stripe onboarding link creation failed.",
      metadata: errorMetadata(error),
    });
    settingsUrl.searchParams.set("error", message);
    return NextResponse.redirect(settingsUrl);
  }
}
