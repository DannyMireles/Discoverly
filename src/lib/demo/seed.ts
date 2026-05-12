import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const DEMO_TAG = "DEMO_SEED";
const DEMO_BOOKING_ID_OFFSET = 9_000_000;

type SeedSummary = {
  affiliates: number;
  promotions: number;
  bookings: number;
  commissions: number;
  unmatched: number;
};

const demoAffiliates = [
  {
    name: "Demo — Marina (Active)",
    slug: "demo-marina",
    publicCode: "MARINA10",
    status: "active" as const,
    stripeConnected: true,
    stripePayoutsEnabled: true,
  },
  {
    name: "Demo — Trevor (Active, no Stripe)",
    slug: "demo-trevor",
    publicCode: "TREVOR10",
    status: "active" as const,
    stripeConnected: false,
    stripePayoutsEnabled: false,
  },
  {
    name: "Demo — Aiyana (Invited)",
    slug: "demo-aiyana",
    publicCode: "AIYANA10",
    status: "invited" as const,
    stripeConnected: false,
    stripePayoutsEnabled: false,
  },
  {
    name: "Demo — Pablo (Paused)",
    slug: "demo-pablo",
    publicCode: "PABLO10",
    status: "paused" as const,
    stripeConnected: true,
    stripePayoutsEnabled: true,
  },
];

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function seedDemoData(companyId: string): Promise<SeedSummary> {
  const supabase = createSupabaseAdminClient();
  await clearDemoData(companyId);

  const summary: SeedSummary = { affiliates: 0, promotions: 0, bookings: 0, commissions: 0, unmatched: 0 };

  const insertedAffiliates: Array<{ id: string; slug: string; publicCode: string; status: string }> = [];

  for (const seed of demoAffiliates) {
    const { data: affiliate, error: affErr } = await supabase
      .from("affiliates")
      .insert({
        company_id: companyId,
        name: seed.name,
        email: `${seed.slug}@demo.discoverly.local`,
        slug: seed.slug,
        status: seed.status,
        stripe_connected: seed.stripeConnected,
        stripe_payouts_enabled: seed.stripePayoutsEnabled,
        stripe_account_id: seed.stripeConnected ? `acct_demo_${seed.slug}` : null,
      })
      .select("id")
      .single();
    if (affErr || !affiliate) throw new Error(`Affiliate seed failed: ${affErr?.message}`);
    summary.affiliates += 1;

    const lodgifyPromotionName = `${DEMO_TAG}|${seed.slug}|10pct`;
    const { data: promotion, error: promErr } = await supabase
      .from("affiliate_promotions")
      .insert({
        company_id: companyId,
        affiliate_id: affiliate.id,
        public_code: seed.publicCode,
        lodgify_promotion_name: lodgifyPromotionName,
        guest_discount_type: "percent",
        guest_discount_value: 10,
        affiliate_payout_type: "percent",
        affiliate_payout_value: 10,
        affiliate_payout_base: "stay_subtotal",
        lodgify_setup_status: seed.status === "active" ? "confirmed" : "needs_lodgify_setup",
        status: seed.status === "active" ? "active" : "draft",
        internal_notes: DEMO_TAG,
      })
      .select("id, lodgify_promotion_name, affiliate_payout_value")
      .single();
    if (promErr || !promotion) throw new Error(`Promotion seed failed: ${promErr?.message}`);
    summary.promotions += 1;

    insertedAffiliates.push({
      id: affiliate.id as string,
      slug: seed.slug,
      publicCode: seed.publicCode,
      status: seed.status,
    });

    if (seed.status !== "active") continue;

    const bookingPlans = [
      { daysAgoArrival: 40, nights: 4, stay: 1200, paid: true },
      { daysAgoArrival: 25, nights: 3, stay: 980, paid: true },
      { daysAgoArrival: 12, nights: 5, stay: 1850, paid: true },
      { daysAgoArrival: -7, nights: 2, stay: 640, paid: false },
    ];

    let bookingCounter = 0;
    for (const plan of bookingPlans) {
      bookingCounter += 1;
      const arrival = daysAgo(plan.daysAgoArrival);
      const departure = new Date(arrival);
      departure.setDate(arrival.getDate() + plan.nights);
      const promotionAmount = plan.stay * 0.1;
      const total = plan.stay + 120;
      const paid = plan.paid ? total : total * 0.3;
      const lodgifyBookingId = DEMO_BOOKING_ID_OFFSET + Math.floor(Math.random() * 900000) + bookingCounter;

      const { data: booking, error: bookingErr } = await supabase
        .from("lodgify_bookings")
        .insert({
          company_id: companyId,
          lodgify_booking_id: lodgifyBookingId,
          property_id: 100001,
          room_type_id: 200001,
          guest_name: `Demo Guest ${seed.slug.split("-")[1]} #${bookingCounter}`,
          guest_email: `demo+${seed.slug}-${bookingCounter}@example.com`,
          arrival: isoDate(arrival),
          departure: isoDate(departure),
          booking_status: plan.paid ? "Booked" : "Tentative",
          is_deleted: false,
          currency_code: "USD",
          total_amount: total,
          amount_paid: paid,
          amount_due: total - paid,
          stay_subtotal: plan.stay,
          promotion_amount: promotionAmount,
          promotion_description: promotion.lodgify_promotion_name,
          is_fully_paid: plan.paid,
          is_affiliate_matched: true,
          affiliate_id: affiliate.id,
          affiliate_promotion_id: promotion.id,
          raw_payload: { demo: DEMO_TAG },
          lodgify_created_at: daysAgo(plan.daysAgoArrival + 14).toISOString(),
          lodgify_updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (bookingErr || !booking) throw new Error(`Booking seed failed: ${bookingErr?.message}`);
      summary.bookings += 1;

      if (!plan.paid) continue;

      const commissionAmount = Number((plan.stay * 0.1).toFixed(2));
      const departed = departure.getTime() < Date.now();
      const status = departed ? "eligible" : "pending";
      const { error: commErr } = await supabase.from("commissions").insert({
        company_id: companyId,
        affiliate_id: affiliate.id,
        affiliate_promotion_id: promotion.id,
        lodgify_booking_id: booking.id,
        booking_total: total,
        commission_base_amount: plan.stay,
        commission_type: "percent",
        commission_value: 10,
        commission_amount: commissionAmount,
        status,
        eligible_at: departed ? new Date().toISOString() : null,
      });
      if (commErr) throw new Error(`Commission seed failed: ${commErr.message}`);
      summary.commissions += 1;
    }
  }

  const unmatchedSamples = [
    { description: `${DEMO_TAG}|ghost-creator|10pct`, amount: 95 },
    { description: `${DEMO_TAG}|misspelled-name|10pct`, amount: 140 },
  ];
  for (const sample of unmatchedSamples) {
    const lodgifyBookingId = DEMO_BOOKING_ID_OFFSET + 500000 + Math.floor(Math.random() * 9000);
    const arrival = daysAgo(20);
    const departure = daysAgo(17);
    const { data: ghostBooking, error: ghostErr } = await supabase
      .from("lodgify_bookings")
      .insert({
        company_id: companyId,
        lodgify_booking_id: lodgifyBookingId,
        property_id: 100002,
        guest_name: "Demo Ghost Guest",
        guest_email: "ghost@example.com",
        arrival: isoDate(arrival),
        departure: isoDate(departure),
        booking_status: "Booked",
        currency_code: "USD",
        total_amount: 950,
        amount_paid: 950,
        amount_due: 0,
        stay_subtotal: 830,
        promotion_amount: sample.amount,
        promotion_description: sample.description,
        is_fully_paid: true,
        is_affiliate_matched: false,
        raw_payload: { demo: DEMO_TAG },
        lodgify_created_at: daysAgo(40).toISOString(),
        lodgify_updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (ghostErr || !ghostBooking) throw new Error(`Ghost booking seed failed: ${ghostErr?.message}`);
    summary.bookings += 1;

    const { error: unmatchedErr } = await supabase.from("unmatched_promotions").insert({
      company_id: companyId,
      lodgify_booking_id: ghostBooking.id,
      promotion_description: sample.description,
      promotion_amount: sample.amount,
      status: "open",
    });
    if (unmatchedErr) throw new Error(`Unmatched seed failed: ${unmatchedErr.message}`);
    summary.unmatched += 1;
  }

  return summary;
}

export async function clearDemoData(companyId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { data: demoAffiliateRows } = await supabase
    .from("affiliates")
    .select("id")
    .eq("company_id", companyId)
    .like("slug", "demo-%");

  const ids = (demoAffiliateRows ?? []).map((row) => row.id as string);

  if (ids.length > 0) {
    await supabase.from("commissions").delete().eq("company_id", companyId).in("affiliate_id", ids);
    await supabase.from("lodgify_bookings").delete().eq("company_id", companyId).in("affiliate_id", ids);
    await supabase.from("affiliate_promotions").delete().eq("company_id", companyId).in("affiliate_id", ids);
    await supabase.from("affiliates").delete().eq("company_id", companyId).in("id", ids);
  }
  await supabase
    .from("lodgify_bookings")
    .delete()
    .eq("company_id", companyId)
    .gte("lodgify_booking_id", DEMO_BOOKING_ID_OFFSET);
  await supabase
    .from("unmatched_promotions")
    .delete()
    .eq("company_id", companyId)
    .like("promotion_description", `${DEMO_TAG}|%`);
}

export async function linkDemoAffiliateToUser(companyId: string, userId: string): Promise<{ affiliateId: string } | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("affiliates")
    .update({ user_id: userId, invite_accepted_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("slug", "demo-marina")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { affiliateId: data.id as string } : null;
}
