import { NextResponse } from "next/server";
import { z } from "zod";
import { sendAffiliateTransfer } from "@/lib/stripe";

const requestSchema = z.object({
  payoutId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  stripeAccountId: z.string().min(3),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payout processing request." }, { status: 400 });
  }

  try {
    const transfer = await sendAffiliateTransfer({
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      destination: parsed.data.stripeAccountId,
      idempotencyKey: `payout_${parsed.data.payoutId}`,
    });

    return NextResponse.json({
      ok: true,
      payoutId: parsed.data.payoutId,
      stripeTransferId: transfer.id,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Stripe transfer failed." },
      { status: 500 },
    );
  }
}
