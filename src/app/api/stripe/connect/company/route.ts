import { NextResponse } from "next/server";
import { logOperationalEvent } from "@/lib/ops/events";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeConnectOAuthUrl } from "@/lib/stripe";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  const admin = createSupabaseAdminClient();
  const { data: member } = await admin
    .from("company_users")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"])
    .maybeSingle();

  if (!member) {
    await logOperationalEvent({
      companyId,
      actorUserId: user.id,
      source: "stripe_connect",
      event: "company_oauth_forbidden",
      level: "warn",
      message: "Non-admin attempted to start company Stripe OAuth.",
    });
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const oauthUrl = await getStripeConnectOAuthUrl(companyId);
  await logOperationalEvent({
    companyId,
    actorUserId: user.id,
    source: "stripe_connect",
    event: "company_oauth_started",
    message: "Company Stripe OAuth started.",
  });
  return NextResponse.redirect(oauthUrl);
}
