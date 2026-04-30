import { NextResponse } from "next/server";
import { z } from "zod";
import { decryptSecret } from "@/lib/crypto/secrets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/guards";
import { sendAffiliateTransfer } from "@/lib/stripe";

const requestSchema = z.object({
  payoutId: z.string().uuid(),
  companyId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  stripeAccountId: z.string().min(3),
});

export async function POST(request: Request) {
  const { user, response: authError } = await requireUser();
  if (authError) return authError;

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payout processing request." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // Verify the caller is an admin of this company
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

  // Load the company's Stripe access token
  const { data: company } = await admin
    .from("companies")
    .select("stripe_access_token_encrypted, stripe_connected")
    .eq("id", parsed.data.companyId)
    .single();

  if (!company?.stripe_connected || !company.stripe_access_token_encrypted) {
    return NextResponse.json(
      { error: "Stripe is not connected for this company. Connect Stripe in Settings first." },
      { status: 422 },
    );
  }

  try {
    const companyAccessToken = decryptSecret(company.stripe_access_token_encrypted);
    const transfer = await sendAffiliateTransfer({
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      destination: parsed.data.stripeAccountId,
      idempotencyKey: `payout_${parsed.data.payoutId}`,
      companyAccessToken,
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
