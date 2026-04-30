import { NextResponse } from "next/server";
import { z } from "zod";
import { createAccountLink, createAffiliateConnectAccount } from "@/lib/stripe";

const requestSchema = z.object({
  affiliateId: z.string().uuid(),
  email: z.string().email(),
  returnUrl: z.string().url(),
  refreshUrl: z.string().url(),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Stripe Connect request." }, { status: 400 });
  }

  try {
    const account = await createAffiliateConnectAccount(parsed.data.email);
    const accountLink = await createAccountLink(
      account.id,
      parsed.data.refreshUrl,
      parsed.data.returnUrl,
    );

    return NextResponse.json({
      affiliateId: parsed.data.affiliateId,
      accountId: account.id,
      url: accountLink.url,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe Connect setup failed." },
      { status: 500 },
    );
  }
}
