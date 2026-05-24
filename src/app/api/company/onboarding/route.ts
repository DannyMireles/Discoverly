import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  inviteToken: z.string().min(1),
  name: z.string().min(2),
  slug: z.string().min(2),
  timezone: z.string().min(2),
  currencyCode: z.string().length(3),
  bookingSiteUrl: z.string().url().optional().or(z.literal("")),
  guestDiscountType: z.enum(["percent", "fixed"]),
  guestDiscountValue: z.number().nonnegative(),
  affiliatePayoutType: z.enum(["percent", "fixed"]),
  affiliatePayoutValue: z.number().nonnegative(),
  affiliatePayoutBase: z.enum(["stay_subtotal", "booking_total", "total_minus_taxes_fees"]),
  payoutPayByDay: z.number().int().min(1).max(28),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid company setup request." }, { status: 400 });
  }

  const expectedToken = process.env.COMPANY_INVITE_TOKEN;
  if (!expectedToken || parsed.data.inviteToken !== expectedToken) {
    return NextResponse.json({ error: "Invalid invite token." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in before setting up a company." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const slug = parsed.data.slug.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");
  const { data: company, error: companyError } = await admin
    .from("companies")
    .upsert(
      {
        name: parsed.data.name,
        slug,
        timezone: parsed.data.timezone,
        currency_code: parsed.data.currencyCode.toUpperCase(),
        booking_site_url: parsed.data.bookingSiteUrl || null,
        guest_discount_type: parsed.data.guestDiscountType,
        guest_discount_value: parsed.data.guestDiscountValue,
        affiliate_payout_type: parsed.data.affiliatePayoutType,
        affiliate_payout_value: parsed.data.affiliatePayoutValue,
        affiliate_payout_base: parsed.data.affiliatePayoutBase,
        payout_pay_by_day: parsed.data.payoutPayByDay,
      },
      { onConflict: "slug" },
    )
    .select("id, name, slug")
    .single();

  if (companyError) {
    return NextResponse.json({ error: companyError.message }, { status: 500 });
  }

  const { error: userError } = await admin.from("company_users").upsert(
    {
      company_id: company.id,
      user_id: user.id,
      role: "owner",
    },
    { onConflict: "company_id,user_id" },
  );

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, company });
}
