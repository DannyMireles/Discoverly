import Link from "next/link";
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
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center py-8">
        <div className="w-full max-w-md">
          {!configured ? (
            <Banner title="Affiliate signup is temporarily unavailable" tone="warning">
              Please try again shortly or contact your host if this continues.
            </Banner>
          ) : !company ? (
            <Banner title="Affiliate program not found" tone="warning">
              This signup link is invalid or has been removed.
            </Banner>
          ) : (
            <Card>
              <CardContent className="space-y-6 p-7 sm:p-8">
                <div className="space-y-2 text-center">
                  <p className="text-xs font-semibold uppercase text-slate-500">Affiliate signup</p>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                    Join {company.name}
                  </h1>
                  <p className="text-sm leading-6 text-[#525a48]">
                    Verify your email to create your code and open your dashboard.
                  </p>
                </div>
                <PublicAffiliateJoinForm
                  companySlug={company.slug as string}
                />
                <div className="grid grid-cols-2 gap-4 border-t border-border/70 pt-5">
                  <ProgramFact label="Guest code" value={formatDiscount(company)} />
                  <ProgramFact label="Payout" value={formatPayout(company)} />
                </div>
                <div className="border-t border-border/70 pt-5 text-center">
                  <Link href="/how-it-works" className="text-sm font-semibold text-[#11101f] underline-offset-4 hover:underline">
                    How the affiliate program works
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ProgramFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
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
