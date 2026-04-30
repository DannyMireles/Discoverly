import { NextResponse } from "next/server";
import { z } from "zod";
import { decryptSecret } from "@/lib/crypto/secrets";
import { syncLodgifyBookings } from "@/lib/lodgify/sync";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const requestSchema = z.object({
  companyId: z.string().uuid(),
  bookingId: z.union([z.string(), z.number()]).optional(),
  modifiedSince: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid sync request." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: company } = await admin
    .from("companies")
    .select("lodgify_api_key_encrypted, lodgify_connected")
    .eq("id", parsed.data.companyId)
    .single();

  if (!company?.lodgify_api_key_encrypted || !company.lodgify_connected) {
    return NextResponse.json(
      { error: "Lodgify is not connected for this company. Add an API key in Settings → Lodgify." },
      { status: 422 },
    );
  }

  try {
    const apiKey = decryptSecret(company.lodgify_api_key_encrypted);
    const results = await syncLodgifyBookings({
      companyId: parsed.data.companyId,
      apiKey,
      bookingId: parsed.data.bookingId,
      modifiedSince: parsed.data.modifiedSince,
    });

    return NextResponse.json({
      ok: true,
      companyId: parsed.data.companyId,
      synced: results.length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Lodgify sync failed." },
      { status: 500 },
    );
  }
}
