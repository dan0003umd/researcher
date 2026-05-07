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
  const requestedNext = requestUrl.searchParams.get("next");
  const hasExplicitNext = Boolean(requestedNext);
  const next = resolveNextPath(requestedNext);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (!hasExplicitNext && next === "/dashboard") {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const metadataRole =
            user.app_metadata && typeof user.app_metadata === "object" && "role" in user.app_metadata
              ? String((user.app_metadata as Record<string, unknown>).role)
              : null;
          const metadataVerified =
            user.app_metadata &&
            typeof user.app_metadata === "object" &&
            "institutional_verified" in user.app_metadata
              ? Boolean((user.app_metadata as Record<string, unknown>).institutional_verified)
              : null;

          const { data: profileRow } = await supabase
            .from("profiles")
            .select("role, institutional_verified")
            .eq("id", user.id)
            .maybeSingle();

          const resolvedRole = metadataRole ?? profileRow?.role ?? null;
          const resolvedVerified = metadataVerified ?? profileRow?.institutional_verified ?? false;
          const isFacultyRole =
            resolvedRole === "faculty" || resolvedRole === "researcher" || resolvedRole === "coordinator";

          if (resolvedVerified && isFacultyRole) {
            const { data: facultyProfile } = await supabase
              .from("faculty_profiles")
              .select("user_id")
              .eq("user_id", user.id)
              .maybeSingle();

            if (facultyProfile) {
              return NextResponse.redirect(new URL("/dashboard/faculty", requestUrl.origin));
            }

            return NextResponse.redirect(new URL("/onboarding/faculty-profile", requestUrl.origin));
          }
        }
      }

      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/auth/login?error=oauth_callback", requestUrl.origin));
}
