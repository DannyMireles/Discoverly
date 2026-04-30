import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const requestSchema = z.object({
  inviteToken: z.string().min(16),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invite acceptance request." }, { status: 400 });
  }

  const sessionSupabase = await import("@/lib/supabase/server").then((module) => module.createSupabaseServerClient());
  const {
    data: { user },
  } = await sessionSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in before accepting the invite." }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("affiliates")
    .update({
      user_id: user.id,
      status: "active",
      invite_accepted_at: new Date().toISOString(),
    })
    .eq("invite_token", parsed.data.inviteToken)
    .is("invite_accepted_at", null)
    .select("id, company_id, public:affiliate_promotions(public_code, lodgify_promotion_name)")
    .single();

  if (error) {
    return NextResponse.json({ error: "Invite token is invalid or already accepted." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, affiliate: data });
}
