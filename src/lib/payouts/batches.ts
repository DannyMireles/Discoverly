import { formatISO } from "date-fns";
import { groupEligibleCommissions, getPreviousMonthPayoutWindow } from "@/lib/payouts";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function createPayoutBatch(companyId: string) {
  const supabase = createSupabaseAdminClient();
  const window = getPreviousMonthPayoutWindow();
  const periodStart = formatISO(window.periodStart, { representation: "date" });
  const periodEnd = formatISO(window.periodEnd, { representation: "date" });
  const payBy = formatISO(window.payBy, { representation: "date" });

  const { data: commissions, error: commissionsError } = await supabase
    .from("commissions")
    .select("id, affiliate_id, commission_amount, status")
    .eq("company_id", companyId)
    .eq("status", "eligible");

  if (commissionsError) throw new Error(commissionsError.message);

  const groups = groupEligibleCommissions(
    (commissions ?? []).map((commission) => ({
      id: commission.id as string,
      affiliate_id: commission.affiliate_id as string,
      commission_amount: Number(commission.commission_amount),
      status: "eligible",
    })),
  );
  const commissionAmounts = new Map(
    (commissions ?? []).map((commission) => [
      commission.id as string,
      Number(commission.commission_amount),
    ]),
  );
  const totalAmount = groups.reduce((total, group) => total + group.amount, 0);

  const { data: batch, error: batchError } = await supabase
    .from("payout_batches")
    .upsert(
      {
        company_id: companyId,
        period_start: periodStart,
        period_end: periodEnd,
        pay_by: payBy,
        status: "draft",
        total_amount: totalAmount,
      },
      { onConflict: "company_id,period_start,period_end" },
    )
    .select("id")
    .single();

  if (batchError) throw new Error(batchError.message);

  for (const group of groups) {
    const { data: payout, error: payoutError } = await supabase
      .from("payouts")
      .upsert(
        {
          company_id: companyId,
          payout_batch_id: batch.id,
          affiliate_id: group.affiliateId,
          amount: group.amount,
          status: "pending",
        },
        { onConflict: "payout_batch_id,affiliate_id" },
      )
      .select("id")
      .single();

    if (payoutError) throw new Error(payoutError.message);

    for (const commissionId of group.commissionIds) {
      await supabase.from("payout_items").upsert(
        {
          payout_id: payout.id,
          commission_id: commissionId,
          amount: commissionAmounts.get(commissionId) ?? 0,
        },
        { onConflict: "payout_id,commission_id" },
      );
    }
  }

  return {
    batchId: batch.id as string,
    periodStart,
    periodEnd,
    payBy,
    totalAmount,
    groups,
  };
}
