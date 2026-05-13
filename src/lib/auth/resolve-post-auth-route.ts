import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function resolvePostAuthRoute(userId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (affiliate?.id) {
    return "/affiliate/dashboard";
  }

  const { data: membership } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (membership?.company_id) {
    return "/company/dashboard";
  }

  return "/company/dashboard";
}

export function redirectMatchesPostAuthRoute(redirectTo: string | null | undefined, postAuthRoute: string) {
  if (!redirectTo?.startsWith("/")) return false;
  if (redirectTo.startsWith("//")) return false;
  return redirectTo.startsWith(postAuthRoute.split("/").slice(0, 2).join("/"));
}
