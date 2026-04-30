import { NextResponse } from "next/server";
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
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const oauthUrl = await getStripeConnectOAuthUrl(companyId);
  return NextResponse.redirect(oauthUrl);
}
