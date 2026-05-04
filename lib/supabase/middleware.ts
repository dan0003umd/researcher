import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const isVerifyEmailRoute = pathname === "/onboarding/verify-email";
  const hasVerificationToken = Boolean(searchParams.get("token"));

  // Allow signed-out verification-link visits so the token can be processed.
  if (isVerifyEmailRoute && hasVerificationToken) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isApiRoute = pathname.startsWith("/api");
  const isAuthRoute = pathname.startsWith("/auth");
  const isDiscoverRoute = pathname.startsWith("/discover");
  const isLabRoute = pathname.startsWith("/lab");
  const isStudentRoute = pathname.startsWith("/student");
  const isFacultyDashboardRoute = pathname.startsWith("/dashboard/faculty");
  const isDashboardHomeRoute = pathname === "/dashboard";
  const isPublicReadOnlyRoute =
    pathname === "/" || pathname.startsWith("/about") || pathname.startsWith("/projects");
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isOnboardingRoute = pathname.startsWith("/onboarding");
  const isProtectedAppRoute = isDashboardRoute || isOnboardingRoute;

  if (!user && isProtectedAppRoute) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (user && !isApiRoute) {
    const institutionalVerified = Boolean(
      user.app_metadata &&
        typeof user.app_metadata === "object" &&
        "institutional_verified" in user.app_metadata &&
        user.app_metadata.institutional_verified,
    );

    if (
      !institutionalVerified &&
      !isAuthRoute &&
      !pathname.startsWith("/onboarding/verify-email") &&
      !isDashboardHomeRoute &&
      !isDiscoverRoute &&
      !isLabRoute &&
      !isStudentRoute &&
      !isPublicReadOnlyRoute
    ) {
      return NextResponse.redirect(new URL("/onboarding/verify-email", request.url));
    }

    if (institutionalVerified && isFacultyDashboardRoute) {
      const role =
        user.app_metadata &&
        typeof user.app_metadata === "object" &&
        "role" in user.app_metadata
          ? String(user.app_metadata.role)
          : "";

      const canAccessFacultyDashboard =
        role === "faculty" || role === "researcher" || role === "coordinator";

      if (!canAccessFacultyDashboard) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    if (institutionalVerified && pathname.startsWith("/onboarding/verify-email")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}
