import { getCurrentUserAndCompany } from "@/lib/company/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CompanyDataState = Awaited<ReturnType<typeof getCompanyData>>;

export async function getCompanyData() {
  const state = await getCurrentUserAndCompany();
  if (!state.configured || !state.user || !state.company) {
    return { ...state, affiliates: [], promotions: [], bookings: [], commissions: [], unmatchedPromotions: [] };
  }

  const supabase = await createSupabaseServerClient();
  const [affiliatesResult, promotionsResult, bookingsResult, commissionsResult, unmatchedResult] =
    await Promise.all([
      supabase.from("affiliates").select("*").eq("company_id", state.company.id).order("created_at", { ascending: false }),
      supabase.from("affiliate_promotions").select("*").eq("company_id", state.company.id).order("created_at", { ascending: false }),
      supabase.from("lodgify_bookings").select("*").eq("company_id", state.company.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("commissions").select("*").eq("company_id", state.company.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("unmatched_promotions").select("*").eq("company_id", state.company.id).order("created_at", { ascending: false }).limit(50),
    ]);

  return {
    ...state,
    affiliates: affiliatesResult.data ?? [],
    promotions: promotionsResult.data ?? [],
    bookings: bookingsResult.data ?? [],
    commissions: commissionsResult.data ?? [],
    unmatchedPromotions: unmatchedResult.data ?? [],
  };
}

export async function getAffiliateData() {
  const state = await getCurrentUserAndCompany();
  if (!state.configured || !state.user) {
    return { ...state, affiliate: null, promotion: null, bookings: [], commissions: [], payouts: [] };
  }

  const supabase = await createSupabaseServerClient();
  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("*")
    .eq("user_id", state.user.id)
    .maybeSingle();

  if (!affiliate) {
    return { ...state, affiliate: null, promotion: null, bookings: [], commissions: [], payouts: [] };
  }

  const [promotionResult, bookingsResult, commissionsResult, payoutsResult, companyResult] = await Promise.all([
    supabase.from("affiliate_promotions").select("*").eq("affiliate_id", affiliate.id).limit(1).maybeSingle(),
    supabase.from("affiliate_booking_summary").select("*").eq("affiliate_id", affiliate.id).limit(100),
    supabase.from("commissions").select("*").eq("affiliate_id", affiliate.id).limit(100),
    supabase.from("payouts").select("*").eq("affiliate_id", affiliate.id).limit(100),
    state.company
      ? Promise.resolve({ data: state.company })
      : supabase.from("companies").select("*").eq("id", affiliate.company_id).maybeSingle(),
  ]);

  return {
    ...state,
    affiliate,
    company: (companyResult.data as typeof state.company) ?? state.company,
    promotion: promotionResult.data,
    bookings: bookingsResult.data ?? [],
    commissions: commissionsResult.data ?? [],
    payouts: payoutsResult.data ?? [],
  };
}

export function summarizeCompany(data: CompanyDataState) {
  const paidMatchedBookings = data.bookings.filter((booking) => booking.is_fully_paid && booking.is_affiliate_matched);
  const revenueDriven = paidMatchedBookings.reduce((sum, booking) => sum + Number(booking.stay_subtotal ?? 0), 0);
  const pendingPayouts = data.commissions
    .filter((commission) => ["pending", "eligible", "approved"].includes(commission.status))
    .reduce((sum, commission) => sum + Number(commission.commission_amount ?? 0), 0);
  const paidThisMonth = data.commissions
    .filter((commission) => commission.status === "paid")
    .reduce((sum, commission) => sum + Number(commission.commission_amount ?? 0), 0);

  return {
    revenueDriven,
    paidBookings: paidMatchedBookings.length,
    pendingPayouts,
    paidThisMonth,
    activeAffiliates: data.affiliates.filter((affiliate) => affiliate.status === "active").length,
  };
}
