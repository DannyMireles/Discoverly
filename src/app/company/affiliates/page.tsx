import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TH, THead, TR } from "@/components/ui/table";
import { AffiliateRow } from "@/components/company/affiliate-row";
import { GenericInviteLinkCard } from "@/components/company/generic-invite-link-card";
import { getCompanyData } from "@/lib/company/data";

export default async function AffiliatesPage() {
  const data = await getCompanyData();

  return (
    <AppShell
      title="Affiliates"
      description="Invite affiliates and manage Lodgify promotion setup."
      actions={<Link href="/company/affiliates/new"><Button><Plus className="h-4 w-4" aria-hidden />New Affiliate</Button></Link>}
    >
      <div className="space-y-6">
        {!data.company ? (
          <Banner title="Company setup needed" tone="warning" action={<Link href="/company/onboarding"><Button>Start Setup</Button></Link>}>
            Complete company setup before adding affiliates.
          </Banner>
        ) : null}
        {data.company ? <GenericInviteLinkCard companySlug={data.company.slug} /> : null}
        <Card>
          <CardHeader><CardTitle>All Affiliates</CardTitle></CardHeader>
          <CardContent className="p-0">
            {data.affiliates.length === 0 ? (
              <div className="p-8 text-sm text-slate-500">No affiliates yet.</div>
            ) : (
              <Table>
                <THead><TR><TH>Name</TH><TH>Email</TH><TH>Public Code</TH><TH>Lodgify Promotion Name</TH><TH>Stripe</TH><TH>Status</TH></TR></THead>
                <TBody>
                  {data.affiliates.map((affiliate) => {
                    const promotion = data.promotions.find((item) => item.affiliate_id === affiliate.id);
                    return (
                      <AffiliateRow
                        key={affiliate.id}
                        affiliateId={affiliate.id}
                        name={affiliate.name}
                        email={affiliate.email}
                        publicCode={promotion?.public_code ?? "Not created"}
                        lodgifyPromotionName={promotion?.lodgify_promotion_name ?? "Not created"}
                        stripeConnected={Boolean(affiliate.stripe_connected)}
                        status={affiliate.status}
                      />
                    );
                  })}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
