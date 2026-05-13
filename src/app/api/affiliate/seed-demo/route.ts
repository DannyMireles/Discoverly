import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { clearAffiliateDemoData, seedAffiliateDemoData } from "@/lib/demo/seed";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const requestSchema = z.object({
  action: z.enum(["seed", "clear"]).default("seed"),
});

export async function POST(request: Request) {
  const { user, response: authError } = await requireUser();
  if (authError) return authError;

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid demo data request." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: affiliate, error } = await admin
    .from("affiliates")
    .select("id, company_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!affiliate) {
    return NextResponse.json(
      { error: "Accept an affiliate invite before seeding affiliate demo data." },
      { status: 404 },
    );
  }

  try {
    if (parsed.data.action === "clear") {
      await clearAffiliateDemoData(affiliate.company_id as string, affiliate.id as string);
      return NextResponse.json({ ok: true, cleared: true });
    }

    const summary = await seedAffiliateDemoData({
      companyId: affiliate.company_id as string,
      affiliateId: affiliate.id as string,
    });

    return NextResponse.json({ ok: true, summary });
  } catch (seedError) {
    return NextResponse.json(
      { error: seedError instanceof Error ? seedError.message : "Affiliate demo seed failed." },
      { status: 500 },
    );
  }
}
