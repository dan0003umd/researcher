import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function resolveNextPath(next: string | null) {
  if (!next || !next.startsWith("/")) {
    return "/dashboard";
  }

  return next;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = resolveNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/auth/login?error=oauth_callback", requestUrl.origin));
}
