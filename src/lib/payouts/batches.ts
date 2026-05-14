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

  const batch = await getOrCreateOpenBatch();

  for (const group of groups) {
    const { data: existingPayout, error: existingPayoutError } = await supabase
      .from("payouts")
      .select("id, status")
      .eq("payout_batch_id", batch.id)
      .eq("affiliate_id", group.affiliateId)
      .maybeSingle();

    if (existingPayoutError) throw new Error(existingPayoutError.message);

    const payout = existingPayout
      ? await updateOpenPayoutAmount(existingPayout.id as string, existingPayout.status as string, group.amount)
      : await insertPayout({
          companyId,
          batchId: batch.id as string,
          affiliateId: group.affiliateId,
          amount: group.amount,
        });

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

  async function getOrCreateOpenBatch() {
    const { data: existingBatch, error: existingBatchError } = await supabase
      .from("payout_batches")
      .select("id, status")
      .eq("company_id", companyId)
      .eq("period_start", periodStart)
      .eq("period_end", periodEnd)
      .maybeSingle();

    if (existingBatchError) throw new Error(existingBatchError.message);

    if (existingBatch) {
      const status = existingBatch.status as string;
      const shouldRefreshAmount = ["draft", "approved", "failed"].includes(status);
      const { data, error } = await supabase
        .from("payout_batches")
        .update({
          pay_by: payBy,
          ...(shouldRefreshAmount ? { total_amount: totalAmount } : {}),
        })
        .eq("id", existingBatch.id)
        .select("id, status")
        .single();

      if (error) throw new Error(error.message);
      return data;
    }

    const { data, error } = await supabase
      .from("payout_batches")
      .insert({
        company_id: companyId,
        period_start: periodStart,
        period_end: periodEnd,
        pay_by: payBy,
        status: "draft",
        total_amount: totalAmount,
      })
      .select("id, status")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async function updateOpenPayoutAmount(payoutId: string, status: string, amount: number) {
    if (!["pending", "approved", "failed"].includes(status)) {
      return { id: payoutId };
    }

    const { data, error } = await supabase
      .from("payouts")
      .update({ amount })
      .eq("id", payoutId)
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async function insertPayout({
    companyId,
    batchId,
    affiliateId,
    amount,
  }: {
    companyId: string;
    batchId: string;
    affiliateId: string;
    amount: number;
  }) {
    const { data, error } = await supabase
      .from("payouts")
      .insert({
        company_id: companyId,
        payout_batch_id: batchId,
        affiliate_id: affiliateId,
        amount,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}
