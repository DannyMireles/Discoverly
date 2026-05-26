import { NextResponse } from "next/server";
import { errorMetadata, logOperationalEvent } from "@/lib/ops/events";
import { createExpressDashboardLoginLink } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const settingsUrl = new URL("/affiliate/settings", requestUrl.origin);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth?redirectTo=/affiliate/settings", requestUrl.origin));
  }

  const admin = createSupabaseAdminClient();
  const { data: affiliate, error } = await admin
    .from("affiliates")
    .select("id, company_id, stripe_account_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    settingsUrl.searchParams.set("stripeDashboard", "error");
    await logOperationalEvent({
      actorUserId: user.id,
      source: "stripe_connect",
      event: "affiliate_dashboard_link_lookup_failed",
      level: "error",
      message: "Affiliate Stripe dashboard link lookup failed.",
      metadata: errorMetadata(error),
    });
    return NextResponse.redirect(settingsUrl);
  }

  if (!affiliate?.stripe_account_id) {
    settingsUrl.searchParams.set("stripeDashboard", "missing");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const loginLink = await createExpressDashboardLoginLink(affiliate.stripe_account_id as string);

    await logOperationalEvent({
      companyId: affiliate.company_id as string,
      affiliateId: affiliate.id as string,
      actorUserId: user.id,
      source: "stripe_connect",
      event: "affiliate_dashboard_link_created",
      message: "Affiliate Stripe Express dashboard login link created.",
      metadata: { accountId: affiliate.stripe_account_id },
    });

    return NextResponse.redirect(loginLink.url);
  } catch (loginError) {
    settingsUrl.searchParams.set("stripeDashboard", "error");
    await logOperationalEvent({
      companyId: affiliate.company_id as string,
      affiliateId: affiliate.id as string,
      actorUserId: user.id,
      source: "stripe_connect",
      event: "affiliate_dashboard_link_failed",
      level: "error",
      message: "Affiliate Stripe Express dashboard login link failed.",
      metadata: errorMetadata(loginError),
    });
    return NextResponse.redirect(settingsUrl);
  }
}
