import { sendOwnerAffiliateNotification } from "@/lib/email/send-owner-affiliate-notification";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type NotifyCompanyOwnerInput = {
  supabase: SupabaseAdminClient;
  companyId: string;
  companyName: string;
  affiliateId: string;
  affiliateName: string;
  affiliateEmail: string;
  publicCode: string;
  lodgifyPromotionName: string;
};

export async function notifyCompanyOwnerAboutAffiliate(input: NotifyCompanyOwnerInput) {
  const ownerEmail = await getCompanyOwnerEmail(input.supabase, input.companyId);
  await sendOwnerAffiliateNotification({
    toEmail: ownerEmail,
    companyName: input.companyName,
    affiliateName: input.affiliateName,
    affiliateEmail: input.affiliateEmail,
    publicCode: input.publicCode,
    lodgifyPromotionName: input.lodgifyPromotionName,
  });

  const { error } = await input.supabase
    .from("affiliates")
    .update({
      owner_notified_at: new Date().toISOString(),
      owner_notification_error: null,
    })
    .eq("id", input.affiliateId);

  if (error) throw new Error(error.message);
}

async function getCompanyOwnerEmail(supabase: SupabaseAdminClient, companyId: string) {
  const { data: ownerMembership, error: ownerError } = await supabase
    .from("company_users")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("role", "owner")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ownerError) throw new Error(ownerError.message);
  if (!ownerMembership?.user_id) {
    throw new Error("No company owner is available for affiliate notifications.");
  }

  const { data, error } = await supabase.auth.admin.getUserById(ownerMembership.user_id as string);
  if (error) throw new Error(error.message);
  if (!data.user?.email) {
    throw new Error("The company owner account does not have an email address.");
  }

  return data.user.email;
}
