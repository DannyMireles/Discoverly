import { NextResponse } from "next/server";
import { createStripeClient } from "@/lib/stripe";
import { requiredEnv } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const stripe = createStripeClient();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      requiredEnv("STRIPE_WEBHOOK_SECRET"),
    );

    return NextResponse.json({
      received: true,
      type: event.type,
      note: "Persist connected account and transfer state changes idempotently in production.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid Stripe webhook." },
      { status: 400 },
    );
  }
}
