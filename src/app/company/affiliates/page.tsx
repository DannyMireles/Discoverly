import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getCompanyData } from "@/lib/company/data";

export default async function AffiliatesPage() {
  const data = await getCompanyData();

  return (
    <AppShell
      title="Affiliates"
      description="Invite-only affiliate records and Lodgify promotion setup."
      actions={<Link href="/company/affiliates/new"><Button><Plus className="h-4 w-4" aria-hidden />New Affiliate</Button></Link>}
    >
      <div className="space-y-6">
        {!data.company ? (
          <Banner title="Company onboarding required" tone="warning" action={<Link href="/company/onboarding"><Button>Start Onboarding</Button></Link>}>Create Zenful Cove before adding affiliates.</Banner>
        ) : null}
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
                      <TR key={affiliate.id}>
                        <TD className="font-medium text-slate-950"><Link href={`/company/affiliates/${affiliate.id}`}>{affiliate.name}</Link></TD>
                        <TD>{affiliate.email}</TD>
                        <TD>{promotion?.public_code ?? "Not created"}</TD>
                        <TD className="font-mono text-xs">{promotion?.lodgify_promotion_name ?? "Not created"}</TD>
                        <TD><StatusBadge status={affiliate.stripe_connected ? "Connected" : "Needs Stripe"} /></TD>
                        <TD><StatusBadge status={affiliate.status} /></TD>
                      </TR>
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
