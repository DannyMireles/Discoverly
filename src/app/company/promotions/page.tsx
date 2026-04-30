import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getCompanyData } from "@/lib/company/data";

export default async function PromotionsPage() {
  const data = await getCompanyData();

  return (
    <AppShell title="Promotions" description="Public codes and machine-readable Lodgify promotion names.">
      <Card>
        <CardHeader><CardTitle>Affiliate Promotions</CardTitle></CardHeader>
        <CardContent className="p-0">
          {data.promotions.length === 0 ? (
            <div className="p-8 text-sm text-slate-500">No promotions yet. Create an affiliate to generate the first promotion.</div>
          ) : (
            <Table>
              <THead><TR><TH>Public Code</TH><TH>Lodgify Promotion Name</TH><TH>Affiliate</TH><TH>Guest Discount</TH><TH>Affiliate Payout</TH><TH>Status</TH></TR></THead>
              <TBody>
                {data.promotions.map((promotion) => {
                  const affiliate = data.affiliates.find((item) => item.id === promotion.affiliate_id);
                  return (
                    <TR key={promotion.id}>
                      <TD>{promotion.public_code}</TD>
                      <TD className="font-mono text-xs">{promotion.lodgify_promotion_name}</TD>
                      <TD>{affiliate?.name ?? "Unknown affiliate"}</TD>
                      <TD>{Number(promotion.guest_discount_value)} {promotion.guest_discount_type}</TD>
                      <TD>{Number(promotion.affiliate_payout_value)} {promotion.affiliate_payout_type}</TD>
                      <TD><StatusBadge status={promotion.status} /></TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
