import { AppShell } from "@/components/layout/app-shell";
import { PublicAffiliateJoinForm } from "@/components/affiliate/public-affiliate-join-form";
import { Banner } from "@/components/ui/banner";
import { Card, CardContent } from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";
import { stripTrailingZeros } from "@/lib/utils/format";

export default async function PublicAffiliateJoinPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const configured = isSupabaseAdminConfigured();
  const normalizedSlug = normalizeCompanySlug(companySlug);
  const company = configured
    ? await createSupabaseAdminClient()
        .from("companies")
        .select(
          "name, slug, booking_site_url, guest_discount_type, guest_discount_value, affiliate_payout_type, affiliate_payout_value, affiliate_payout_base",
        )
        .eq("slug", normalizedSlug)
        .maybeSingle()
        .then((result) => result.data)
    : null;

  return (
    <AppShell title="Join affiliate program" description="Create your affiliate account." hideNav>
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          {!configured ? (
            <Banner title="Supabase is not configured" tone="warning">
              Add Supabase environment variables before accepting affiliate signups.
            </Banner>
          ) : !company ? (
            <Banner title="Affiliate program not found" tone="warning">
              This signup link is invalid or has been removed.
            </Banner>
          ) : (
            <>
              <Card>
                <CardContent className="space-y-5 p-7">
                  <div>
                    <p className="text-sm font-semibold uppercase text-slate-500">Affiliate program</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                      {company.name}
                    </h1>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <ProgramFact label="Guest code" value={formatDiscount(company)} />
                    <ProgramFact label="Payout" value={formatPayout(company)} />
                    <ProgramFact label="Booking site" value={company.booking_site_url ? "Configured" : "Pending"} />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
        {company ? (
          <PublicAffiliateJoinForm
            companyName={company.name as string}
            companySlug={company.slug as string}
          />
        ) : null}
      </div>
    </AppShell>
  );
}

function ProgramFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border/70 pt-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function normalizeCompanySlug(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function formatDiscount(company: {
  guest_discount_type?: string | null;
  guest_discount_value?: number | string | null;
}) {
  const value = Number(company.guest_discount_value ?? 0);
  return company.guest_discount_type === "fixed"
    ? `$${stripTrailingZeros(value)} off`
    : `${stripTrailingZeros(value)}% off`;
}

function formatPayout(company: {
  affiliate_payout_type?: string | null;
  affiliate_payout_value?: number | string | null;
}) {
  const value = Number(company.affiliate_payout_value ?? 0);
  return company.affiliate_payout_type === "fixed"
    ? `$${stripTrailingZeros(value)}`
    : `${stripTrailingZeros(value)}%`;
}
