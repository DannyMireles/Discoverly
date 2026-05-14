"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  payoutId: string | null;
};

export function PayoutsView({
  companyId,
  groups,
}: {
  companyId: string;
  groups: PayoutRow[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PayoutTab>("Current batch");
  const [heldAffiliates, setHeldAffiliates] = useState<string[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [processingPayoutId, setProcessingPayoutId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const pendingAmount = groups
    .filter((group) => ["pending", "held"].includes(group.status))
    .reduce((total, group) => total + group.commissionAmount, 0);
  const eligibleAmount = groups
    .filter((group) => ["pending", "approved", "processing", "failed", "held"].includes(group.status))
    .reduce((total, group) => total + group.commissionAmount, 0);
  const approvedAmount = groups
    .filter((group) => group.status === "approved")
    .reduce((sum, group) => sum + group.commissionAmount, 0);
  const paidAmount = groups
    .filter((group) => group.status === "paid")
    .reduce((sum, group) => sum + group.commissionAmount, 0);
  const failedAmount = groups
    .filter((group) => group.status === "failed")
    .reduce((sum, group) => sum + group.commissionAmount, 0);

  const visibleGroups = useMemo(() => {
    if (activeTab === "Current batch") return groups;
    if (activeTab === "Pending") return groups.filter((group) => group.status === "pending" || group.status === "held");
    if (activeTab === "Approved") return groups.filter((group) => group.status === "approved");
    if (activeTab === "Paid") return groups.filter((group) => group.status === "paid");
    if (activeTab === "Failed") return groups.filter((group) => group.status === "failed");
    if (activeTab === "Canceled/Reversed") return groups.filter((group) => ["canceled", "failed"].includes(group.status));
    return [];
  }, [activeTab, groups]);

  function toggleHold(affiliate: string) {
    setHeldAffiliates((current) =>
      current.includes(affiliate)
        ? current.filter((name) => name !== affiliate)
        : [...current, affiliate],
    );
  }

  async function createCurrentBatch() {
    setBatchLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/payouts/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not create payout batch.");
      setMessage({ tone: "success", text: "Payout batch is ready." });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not create payout batch." });
    } finally {
      setBatchLoading(false);
    }
  }

  async function sendPayout(payoutId: string) {
    setProcessingPayoutId(payoutId);
    setMessage(null);
    try {
      const response = await fetch("/api/payouts/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId }),
      });
      const payload = (await response.json()) as { error?: string; stripeTransferId?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not send payout.");
      setMessage({
        tone: "success",
        text: `Payout sent${payload.stripeTransferId ? ` with transfer ${payload.stripeTransferId}` : ""}.`,
      });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not send payout." });
    } finally {
      setProcessingPayoutId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Pending" value={formatCurrency(pendingAmount)} icon={<Clock className="h-5 w-5" />} tone="amber" />
        <StatCard label="Eligible" value={formatCurrency(eligibleAmount)} icon={<BadgeDollarSign className="h-5 w-5" />} />
        <StatCard label="Approved" value={formatCurrency(approvedAmount)} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
        <StatCard label="Paid This Month" value={formatCurrency(paidAmount)} icon={<Send className="h-5 w-5" />} tone="green" />
        <StatCard label="Failed" value={formatCurrency(failedAmount)} icon={<XCircle className="h-5 w-5" />} tone="slate" />
      </section>
      <Banner title="Manual approval required">
        Build the monthly batch, review each row, then send Stripe Connect transfers manually.
      </Banner>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => void createCurrentBatch()} disabled={batchLoading || !companyId}>
          {batchLoading ? "Preparing..." : "Prepare Current Batch"}
        </Button>
        {message ? (
          <p className={`text-sm ${message.tone === "success" ? "text-emerald-700" : "text-red-600"}`}>
            {message.text}
          </p>
        ) : null}
      </div>
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
                  const isProcessing =
                    Boolean(group.payoutId) && processingPayoutId === group.payoutId;

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
                          <Button
                            className="h-9 min-h-9"
                            disabled={
                              isHeld ||
                              !group.payoutId ||
                              group.stripeStatus !== "Connected" ||
                              ["paid", "processing", "canceled"].includes(group.status) ||
                              isProcessing
                            }
                            onClick={() => group.payoutId && void sendPayout(group.payoutId)}
                          >
                            {isProcessing ? "Sending..." : "Send Payout"}
                          </Button>
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
