import { NextResponse } from "next/server";
import { z } from "zod";
import { syncLodgifyBookings } from "@/lib/lodgify/sync";
import { requiredEnv } from "@/lib/supabase/server";

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

  try {
    const results = await syncLodgifyBookings({
      companyId: parsed.data.companyId,
      apiKey: requiredEnv("LODGIFY_API_KEY"),
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
