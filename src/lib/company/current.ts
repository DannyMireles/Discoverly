import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type CurrentCompany = {
  id: string;
  name: string;
  slug: string;
  lodgify_connected: boolean;
  stripe_connected: boolean;
  timezone: string;
  currency_code: string;
  booking_site_url: string | null;
  guest_discount_type?: string | null;
  guest_discount_value?: number | null;
  affiliate_payout_type?: string | null;
  affiliate_payout_value?: number | null;
  affiliate_payout_base?: string | null;
  payout_pay_by_day?: number | null;
};

export async function getCurrentUserAndCompany() {
  if (!isSupabaseConfigured()) {
    return { user: null, company: null, configured: false };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, company: null, configured: true };
  }

  const { data: membership } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.company_id) {
    return { user, company: null, configured: true };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", membership.company_id)
    .single();

  return { user, company: company as CurrentCompany | null, configured: true };
}
