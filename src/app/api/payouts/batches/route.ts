import { NextResponse } from "next/server";
import { z } from "zod";
import { createPayoutBatch } from "@/lib/payouts/batches";

const requestSchema = z.object({
  companyId: z.string().uuid(),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payout batch request." }, { status: 400 });
  }

  try {
    const batch = await createPayoutBatch(parsed.data.companyId);
    return NextResponse.json({ ok: true, companyId: parsed.data.companyId, batch });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payout batch creation failed." },
      { status: 500 },
    );
  }
}
