import { NextResponse } from "next/server";
import { createAffiliate, createAffiliateSchema } from "@/lib/affiliates/create-affiliate";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = createAffiliateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid affiliate request." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: membership } = await supabase
      .from("company_users")
      .select("role")
      .eq("company_id", parsed.data.companyId)
      .eq("user_id", user.id)
      .in("role", ["owner", "admin"])
      .maybeSingle();

    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const affiliate = await createAffiliate(parsed.data);
    return NextResponse.json({ ok: true, affiliate });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Affiliate creation failed." },
      { status: 500 },
    );
  }
}
