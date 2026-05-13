import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  const supabase = await createSupabaseServerClient();

  const { data: membership } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", user!.id)
    .limit(1)
    .maybeSingle();

  if (membership?.company_id) {
    return NextResponse.json({ route: "/company/dashboard" });
  }

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id")
    .eq("user_id", user!.id)
    .limit(1)
    .maybeSingle();

  if (affiliate?.id) {
    return NextResponse.json({ route: "/affiliate/dashboard" });
  }

  return NextResponse.json({ route: "/company/dashboard" });
}
