import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { redirectMatchesPostAuthRoute, resolvePostAuthRoute } from "@/lib/auth/resolve-post-auth-route";

export async function GET(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const postAuthRoute = await resolvePostAuthRoute(user!.id);
  const redirectTo = searchParams.get("redirectTo");
  const route = redirectMatchesPostAuthRoute(redirectTo, postAuthRoute) ? redirectTo! : postAuthRoute;

  return NextResponse.json({ route });
}
