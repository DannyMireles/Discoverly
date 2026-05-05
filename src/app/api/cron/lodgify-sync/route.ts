import { NextResponse } from "next/server";
import { decryptSecret } from "@/lib/crypto/secrets";
import { syncLodgifyBookings } from "@/lib/lodgify/sync";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requiredEnv } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const expected = `Bearer ${requiredEnv("CRON_SECRET")}`;
  if (request.headers.get("authorization") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data: companies, error } = await admin
    .from("companies")
    .select("id, name, lodgify_api_key_encrypted")
    .eq("lodgify_connected", true)
    .not("lodgify_api_key_encrypted", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const modifiedSince = new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString();
  const summary: Array<{
    companyId: string;
    name: string;
    ok: boolean;
    synced?: number;
    error?: string;
  }> = [];

  for (const company of companies ?? []) {
    try {
      const apiKey = decryptSecret(company.lodgify_api_key_encrypted as string);
      const results = await syncLodgifyBookings({
        companyId: company.id as string,
        apiKey,
        modifiedSince,
      });
      summary.push({
        companyId: company.id as string,
        name: company.name as string,
        ok: true,
        synced: results.length,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lodgify sync failed.";
      await admin.from("sync_logs").insert({
        company_id: company.id as string,
        source: "lodgify",
        status: "error",
        message,
        finished_at: new Date().toISOString(),
      });
      summary.push({
        companyId: company.id as string,
        name: company.name as string,
        ok: false,
        error: message,
      });
    }
  }

  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), summary });
}
