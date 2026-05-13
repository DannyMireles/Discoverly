import { redirect } from "next/navigation";
import { resolvePostAuthRoute } from "@/lib/auth/resolve-post-auth-route";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  redirect(await resolvePostAuthRoute(user.id));
}
