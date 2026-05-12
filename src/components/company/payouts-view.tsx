"use client";

import { useMemo, useState } from "react";
import { BadgeDollarSign, CheckCircle2, Clock, Send, XCircle } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatCurrency } from "@/lib/utils/format";

const tabs = ["Current batch", "Pending", "Approved", "Paid", "Failed", "Canceled/Reversed"] as const;

type PayoutTab = (typeof tabs)[number];

type PayoutRow = {
  affiliate: string;
  stripeStatus: string;
  eligibleBookings: number;
  revenueDriven: number;
  commissionAmount: number;
  status: string;
};

export function PayoutsView({ groups }: { groups: PayoutRow[] }) {
  const [activeTab, setActiveTab] = useState<PayoutTab>("Current batch");
  const [heldAffiliates, setHeldAffiliates] = useState<string[]>([]);
  const eligible = groups.reduce((total, group) => total + group.commissionAmount, 0);

  const visibleGroups = useMemo(() => {
    if (activeTab === "Current batch") return groups;
    if (activeTab === "Pending") return groups.filter((group) => group.status === "pending" || group.status === "held");
    if (activeTab === "Approved") return groups.filter((group) => group.status === "approved");
    return [];
  }, [activeTab, groups]);

  function toggleHold(affiliate: string) {
    setHeldAffiliates((current) =>
      current.includes(affiliate)
        ? current.filter((name) => name !== affiliate)
        : [...current, affiliate],
    );
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Pending" value={formatCurrency(eligible)} icon={<Clock className="h-5 w-5" />} tone="amber" />
        <StatCard label="Eligible" value={formatCurrency(eligible)} icon={<BadgeDollarSign className="h-5 w-5" />} />
        <StatCard label="Approved" value={formatCurrency(groups.filter((group) => group.status === "approved").reduce((sum, group) => sum + group.commissionAmount, 0))} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
        <StatCard label="Paid This Month" value={formatCurrency(groups.filter((group) => group.status === "paid").reduce((sum, group) => sum + group.commissionAmount, 0))} icon={<Send className="h-5 w-5" />} tone="green" />
        <StatCard label="Failed" value="$0.00" icon={<XCircle className="h-5 w-5" />} tone="slate" />
      </section>
      <Banner title="Manual approval required">
        Discoverly.ai calculates eligible unpaid commissions. Admin approval sends Stripe Connect transfers.
      </Banner>
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-border/80 bg-white p-2 shadow-sm">
        {tabs.map((tab) => (
          <Button
            key={tab}
            type="button"
            variant={tab === activeTab ? "primary" : "ghost"}
            onClick={() => setActiveTab(tab)}
            className="shrink-0"
          >
            {tab}
          </Button>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{activeTab}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {visibleGroups.length === 0 ? (
            <div className="p-8 text-sm text-slate-500">No payout rows in this tab yet.</div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Affiliate</TH>
                  <TH>Stripe Status</TH>
                  <TH>Eligible Bookings</TH>
                  <TH>Revenue Driven</TH>
                  <TH>Commission Amount</TH>
                  <TH>Status</TH>
                  <TH>Action</TH>
                </TR>
              </THead>
              <TBody>
                {visibleGroups.map((group) => {
                  const isHeld = heldAffiliates.includes(group.affiliate);

                  return (
                    <TR key={group.affiliate}>
                      <TD className="font-medium text-slate-950">{group.affiliate}</TD>
                      <TD><StatusBadge status={group.stripeStatus} /></TD>
                      <TD>{group.eligibleBookings}</TD>
                      <TD>{formatCurrency(group.revenueDriven)}</TD>
                      <TD>{formatCurrency(group.commissionAmount)}</TD>
                      <TD><StatusBadge status={isHeld ? "held" : group.status} /></TD>
                      <TD>
                        <div className="flex gap-2">
                          <Button variant={isHeld ? "secondary" : "primary"} className="h-9 min-h-9" onClick={() => toggleHold(group.affiliate)}>
                            {isHeld ? "Release Hold" : "Hold"}
                          </Button>
                          <Button className="h-9 min-h-9" disabled={isHeld || group.stripeStatus !== "Connected"}>Approve</Button>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
