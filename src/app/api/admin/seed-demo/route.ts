import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { clearDemoData, linkDemoAffiliateToUser, seedDemoData } from "@/lib/demo/seed";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const requestSchema = z.object({
  companyId: z.string().uuid(),
  action: z.enum(["seed", "clear"]).default("seed"),
  linkAffiliateToMe: z.boolean().optional(),
});

export async function POST(request: Request) {
  const { user, response: authError } = await requireUser();
  if (authError) return authError;

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid seed request." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: member } = await admin
    .from("company_users")
    .select("role")
    .eq("company_id", parsed.data.companyId)
    .eq("user_id", user!.id)
    .in("role", ["owner", "admin"])
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    if (parsed.data.action === "clear") {
      await clearDemoData(parsed.data.companyId);
      return NextResponse.json({ ok: true, cleared: true });
    }

    const summary = await seedDemoData(parsed.data.companyId);
    let linkedAffiliateId: string | null = null;
    if (parsed.data.linkAffiliateToMe) {
      const linked = await linkDemoAffiliateToUser(parsed.data.companyId, user!.id);
      linkedAffiliateId = linked?.affiliateId ?? null;
    }

    return NextResponse.json({ ok: true, summary, linkedAffiliateId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Seed failed." },
      { status: 500 },
    );
  }
}
