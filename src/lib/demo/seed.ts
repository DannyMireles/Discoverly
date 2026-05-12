import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const DEMO_TAG = "DEMO_SEED";
const DEMO_BOOKING_ID_OFFSET = 9_000_000;
const DEMO_PROPERTIES = [101_001, 101_002, 101_003, 101_004, 101_005, 101_006];
const FIRST_NAMES = ["Alex", "Jordan", "Sam", "Riley", "Casey", "Morgan", "Quinn", "Avery", "Skyler", "Reese", "Drew", "Hayden", "Parker", "Logan", "Cameron", "Emerson"];
const LAST_NAMES = ["Smith", "Garcia", "Nguyen", "Patel", "Johnson", "Lee", "Brown", "Wilson", "Khan", "Rivera", "Cole", "Bennett", "Foster", "Holt", "Reyes"];

type SeedSummary = {
  affiliates: number;
  promotions: number;
  bookings: number;
  commissions: number;
  unmatched: number;
  payouts: number;
  payoutBatches: number;
};

type AffiliateSeed = {
  name: string;
  slug: string;
  publicCode: string;
  status: "active" | "invited" | "paused" | "archived";
  stripeConnected: boolean;
  stripePayoutsEnabled: boolean;
  bookingCount: number;
  /** Whether this affiliate has rotated their promotion once. */
  hasRotation: boolean;
  payoutPercent: number;
  discountPercent: number;
};

const demoAffiliates: AffiliateSeed[] = [
  { name: "Demo — Marina (Top performer)", slug: "demo-marina", publicCode: "MARINA10", status: "active", stripeConnected: true, stripePayoutsEnabled: true, bookingCount: 28, hasRotation: true, payoutPercent: 12, discountPercent: 10 },
  { name: "Demo — Trevor (Active, no Stripe)", slug: "demo-trevor", publicCode: "TREVOR10", status: "active", stripeConnected: false, stripePayoutsEnabled: false, bookingCount: 12, hasRotation: false, payoutPercent: 10, discountPercent: 10 },
  { name: "Demo — Aiyana (Invited)", slug: "demo-aiyana", publicCode: "AIYANA10", status: "invited", stripeConnected: false, stripePayoutsEnabled: false, bookingCount: 0, hasRotation: false, payoutPercent: 10, discountPercent: 10 },
  { name: "Demo — Pablo (Paused)", slug: "demo-pablo", publicCode: "PABLO10", status: "paused", stripeConnected: true, stripePayoutsEnabled: true, bookingCount: 6, hasRotation: false, payoutPercent: 10, discountPercent: 10 },
  { name: "Demo — Indira (Growing)", slug: "demo-indira", publicCode: "INDI15", status: "active", stripeConnected: true, stripePayoutsEnabled: true, bookingCount: 18, hasRotation: false, payoutPercent: 12, discountPercent: 15 },
  { name: "Demo — Hiroshi (Veteran)", slug: "demo-hiroshi", publicCode: "HIRO10", status: "active", stripeConnected: true, stripePayoutsEnabled: true, bookingCount: 22, hasRotation: true, payoutPercent: 11, discountPercent: 10 },
  { name: "Demo — Nadia (New)", slug: "demo-nadia", publicCode: "NADIA10", status: "active", stripeConnected: true, stripePayoutsEnabled: true, bookingCount: 4, hasRotation: false, payoutPercent: 10, discountPercent: 10 },
  { name: "Demo — Lucia (Inconsistent)", slug: "demo-lucia", publicCode: "LUCIA12", status: "active", stripeConnected: true, stripePayoutsEnabled: true, bookingCount: 9, hasRotation: false, payoutPercent: 10, discountPercent: 12 },
  { name: "Demo — Otis (High commission)", slug: "demo-otis", publicCode: "OTIS10", status: "active", stripeConnected: true, stripePayoutsEnabled: true, bookingCount: 16, hasRotation: false, payoutPercent: 15, discountPercent: 10 },
  { name: "Demo — Yara (Archived)", slug: "demo-yara", publicCode: "YARA10", status: "archived", stripeConnected: true, stripePayoutsEnabled: true, bookingCount: 5, hasRotation: false, payoutPercent: 10, discountPercent: 10 },
];

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)];
}

function makeGuestName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

function lodgifyName(slug: string, payoutPercent: number, discountPercent: number, tag = "v1") {
  return `${DEMO_TAG}|${slug}|${discountPercent}pct|${payoutPercent}pct|${tag}`;
}

export async function seedDemoData(companyId: string): Promise<SeedSummary> {
  const supabase = createSupabaseAdminClient();
  await clearDemoData(companyId);

  const summary: SeedSummary = {
    affiliates: 0,
    promotions: 0,
    bookings: 0,
    commissions: 0,
    unmatched: 0,
    payouts: 0,
    payoutBatches: 0,
  };

  let bookingIdSeq = DEMO_BOOKING_ID_OFFSET;
  const affiliatesById: Array<{ id: string; promotionId: string; seed: AffiliateSeed }> = [];

  // ---------- Affiliates, promotions (incl. rotated history), bookings, commissions ----------
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
        invite_accepted_at: seed.status === "active" || seed.status === "paused" ? daysAgo(rand(20, 120)).toISOString() : null,
        invite_sent_at: daysAgo(rand(30, 180)).toISOString(),
      })
      .select("id")
      .single();
    if (affErr || !affiliate) throw new Error(`Affiliate seed failed: ${affErr?.message}`);
    summary.affiliates += 1;

    // Optional historical (expired) promotion to demonstrate rotation
    if (seed.hasRotation) {
      const oldName = lodgifyName(seed.slug, seed.payoutPercent, seed.discountPercent, "v0");
      const oldPublic = `${seed.publicCode.replace(/\d+$/, "")}OLD`;
      await supabase.from("affiliate_promotions").insert({
        company_id: companyId,
        affiliate_id: affiliate.id,
        public_code: oldPublic,
        lodgify_promotion_name: oldName,
        guest_discount_type: "percent",
        guest_discount_value: seed.discountPercent,
        affiliate_payout_type: "percent",
        affiliate_payout_value: seed.payoutPercent,
        affiliate_payout_base: "stay_subtotal",
        lodgify_setup_status: "confirmed",
        status: "expired",
        expires_at: daysAgo(rand(60, 150)).toISOString(),
        internal_notes: DEMO_TAG,
      });
      summary.promotions += 1;
    }

    const lodgifyPromotionName = lodgifyName(seed.slug, seed.payoutPercent, seed.discountPercent);
    const { data: promotion, error: promErr } = await supabase
      .from("affiliate_promotions")
      .insert({
        company_id: companyId,
        affiliate_id: affiliate.id,
        public_code: seed.publicCode,
        lodgify_promotion_name: lodgifyPromotionName,
        guest_discount_type: "percent",
        guest_discount_value: seed.discountPercent,
        affiliate_payout_type: "percent",
        affiliate_payout_value: seed.payoutPercent,
        affiliate_payout_base: "stay_subtotal",
        lodgify_setup_status: seed.status === "active" ? "confirmed" : "needs_lodgify_setup",
        status: seed.status === "active" || seed.status === "paused" ? "active" : "draft",
        internal_notes: DEMO_TAG,
      })
      .select("id, lodgify_promotion_name")
      .single();
    if (promErr || !promotion) throw new Error(`Promotion seed failed: ${promErr?.message}`);
    summary.promotions += 1;

    affiliatesById.push({ id: affiliate.id as string, promotionId: promotion.id as string, seed });

    if (seed.bookingCount === 0) continue;

    // Spread bookings across the last 12 months
    const eligibleCommissionIds: Array<{ id: string; amount: number; eligibleAt: string }> = [];
    for (let i = 0; i < seed.bookingCount; i += 1) {
      const daysBack = rand(2, 360);
      const arrival = daysAgo(daysBack);
      const nights = rand(2, 7);
      const departure = new Date(arrival);
      departure.setDate(arrival.getDate() + nights);
      const isFuture = departure.getTime() > Date.now();
      const stay = rand(600, 3200);
      const fees = rand(80, 220);
      const total = stay + fees;
      const isPaid = !isFuture && Math.random() < 0.92;
      const isCanceled = !isPaid && !isFuture && Math.random() < 0.15;
      const paid = isPaid ? total : isFuture ? Math.round(total * 0.3) : Math.round(total * (Math.random() * 0.4));

      bookingIdSeq += 1;
      const propertyId = pick(DEMO_PROPERTIES);
      const promotionAmount = Number((stay * (seed.discountPercent / 100)).toFixed(2));

      const { data: booking, error: bookingErr } = await supabase
        .from("lodgify_bookings")
        .insert({
          company_id: companyId,
          lodgify_booking_id: bookingIdSeq,
          property_id: propertyId,
          room_type_id: propertyId + 100_000,
          guest_name: makeGuestName(),
          guest_email: `guest+${bookingIdSeq}@example.com`,
          arrival: isoDate(arrival),
          departure: isoDate(departure),
          booking_status: isCanceled ? "Canceled" : isPaid ? "Booked" : isFuture ? "Tentative" : "Pending",
          is_deleted: false,
          canceled_at: isCanceled ? daysAgo(daysBack - rand(1, 5)).toISOString() : null,
          currency_code: "USD",
          total_amount: total,
          amount_paid: paid,
          amount_due: total - paid,
          stay_subtotal: stay,
          promotion_amount: promotionAmount,
          promotion_description: promotion.lodgify_promotion_name,
          is_fully_paid: isPaid,
          is_affiliate_matched: true,
          affiliate_id: affiliate.id,
          affiliate_promotion_id: promotion.id,
          raw_payload: { demo: DEMO_TAG },
          lodgify_created_at: daysAgo(daysBack + rand(10, 60)).toISOString(),
          lodgify_updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (bookingErr || !booking) throw new Error(`Booking seed failed: ${bookingErr?.message}`);
      summary.bookings += 1;

      if (!isPaid || isCanceled) continue;

      const commissionAmount = Number((stay * (seed.payoutPercent / 100)).toFixed(2));
      const departed = departure.getTime() < Date.now();
      let status: "pending" | "eligible" | "approved" | "paid" | "held" | "canceled";
      const roll = Math.random();
      if (!departed) status = "pending";
      else if (roll < 0.45) status = "paid";
      else if (roll < 0.65) status = "approved";
      else if (roll < 0.85) status = "eligible";
      else if (roll < 0.93) status = "held";
      else status = "pending";

      const eligibleAt = departed ? daysAgo(Math.max(1, daysBack - nights - rand(0, 3))).toISOString() : null;
      const approvedAt = ["approved", "paid"].includes(status) ? daysAgo(Math.max(1, daysBack - nights - rand(2, 10))).toISOString() : null;
      const paidAt = status === "paid" ? daysAgo(Math.max(1, daysBack - nights - rand(4, 14))).toISOString() : null;

      const { data: commission, error: commErr } = await supabase
        .from("commissions")
        .insert({
          company_id: companyId,
          affiliate_id: affiliate.id,
          affiliate_promotion_id: promotion.id,
          lodgify_booking_id: booking.id,
          booking_total: total,
          commission_base_amount: stay,
          commission_type: "percent",
          commission_value: seed.payoutPercent,
          commission_amount: commissionAmount,
          status,
          eligible_at: eligibleAt,
          approved_at: approvedAt,
          paid_at: paidAt,
          stripe_transfer_id: status === "paid" ? `tr_demo_${bookingIdSeq}` : null,
        })
        .select("id")
        .single();
      if (commErr || !commission) throw new Error(`Commission seed failed: ${commErr?.message}`);
      summary.commissions += 1;

      if (status === "eligible" && eligibleAt) {
        eligibleCommissionIds.push({ id: commission.id as string, amount: commissionAmount, eligibleAt });
      }
    }

    // ---------- Optionally create a draft payout batch for this affiliate's eligible pool ----------
    if (eligibleCommissionIds.length >= 2 && seed.stripeConnected && Math.random() < 0.7) {
      const total = eligibleCommissionIds.reduce((sum, item) => sum + item.amount, 0);
      const periodEnd = daysAgo(rand(5, 25));
      const periodStart = new Date(periodEnd);
      periodStart.setDate(periodEnd.getDate() - 30);
      const payBy = new Date(periodEnd);
      payBy.setDate(periodEnd.getDate() + 7);

      const { data: batch, error: batchErr } = await supabase
        .from("payout_batches")
        .insert({
          company_id: companyId,
          period_start: isoDate(periodStart),
          period_end: isoDate(periodEnd),
          pay_by: isoDate(payBy),
          status: "draft",
          total_amount: total,
        })
        .select("id")
        .single();
      if (batchErr || !batch) {
        // Likely a unique-(company,period_start,period_end) collision when seed re-runs same day; safe to skip.
        continue;
      }
      summary.payoutBatches += 1;

      const { data: payout, error: payoutErr } = await supabase
        .from("payouts")
        .insert({
          company_id: companyId,
          payout_batch_id: batch.id,
          affiliate_id: affiliate.id,
          amount: total,
          status: "pending",
        })
        .select("id")
        .single();
      if (payoutErr || !payout) continue;
      summary.payouts += 1;

      for (const item of eligibleCommissionIds) {
        await supabase.from("payout_items").insert({
          payout_id: payout.id,
          commission_id: item.id,
          amount: item.amount,
        });
      }
    }
  }

  // ---------- Unmatched promotions (orphan bookings using unknown codes) ----------
  const unmatchedSamples = [
    { description: `${DEMO_TAG}|ghost-creator|10pct|10pct|v1`, amount: 95 },
    { description: `${DEMO_TAG}|misspelled-name|10pct|10pct|v1`, amount: 140 },
    { description: `${DEMO_TAG}|old-code|10pct|10pct|v0`, amount: 80 },
    { description: `${DEMO_TAG}|untracked|10pct|10pct|v1`, amount: 175 },
  ];
  for (const sample of unmatchedSamples) {
    bookingIdSeq += 1;
    const arrival = daysAgo(rand(15, 90));
    const departure = new Date(arrival);
    departure.setDate(arrival.getDate() + rand(2, 6));
    const { data: ghostBooking, error: ghostErr } = await supabase
      .from("lodgify_bookings")
      .insert({
        company_id: companyId,
        lodgify_booking_id: bookingIdSeq,
        property_id: pick(DEMO_PROPERTIES),
        guest_name: makeGuestName(),
        guest_email: `ghost+${bookingIdSeq}@example.com`,
        arrival: isoDate(arrival),
        departure: isoDate(departure),
        booking_status: "Booked",
        currency_code: "USD",
        total_amount: 950 + rand(0, 600),
        amount_paid: 950 + rand(0, 600),
        amount_due: 0,
        stay_subtotal: 830 + rand(0, 500),
        promotion_amount: sample.amount,
        promotion_description: sample.description,
        is_fully_paid: true,
        is_affiliate_matched: false,
        raw_payload: { demo: DEMO_TAG },
        lodgify_created_at: daysAgo(rand(40, 120)).toISOString(),
        lodgify_updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (ghostErr || !ghostBooking) throw new Error(`Ghost booking seed failed: ${ghostErr?.message}`);
    summary.bookings += 1;

    await supabase.from("unmatched_promotions").insert({
      company_id: companyId,
      lodgify_booking_id: ghostBooking.id,
      promotion_description: sample.description,
      promotion_amount: sample.amount,
      status: "open",
    });
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
    const { data: payoutsForAffiliates } = await supabase
      .from("payouts")
      .select("id, payout_batch_id")
      .eq("company_id", companyId)
      .in("affiliate_id", ids);
    const payoutIds = (payoutsForAffiliates ?? []).map((row) => row.id as string);
    const batchIds = Array.from(new Set((payoutsForAffiliates ?? []).map((row) => row.payout_batch_id as string)));
    if (payoutIds.length > 0) {
      await supabase.from("payout_items").delete().in("payout_id", payoutIds);
      await supabase.from("payouts").delete().in("id", payoutIds);
    }
    if (batchIds.length > 0) {
      await supabase.from("payout_batches").delete().in("id", batchIds);
    }

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

export async function linkDemoAffiliateToUser(
  companyId: string,
  userId: string,
): Promise<{ affiliateId: string } | null> {
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
