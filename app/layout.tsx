import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import { cookies } from "next/headers";
import { Footer } from "@/components/shared/layout/Footer";
import { Navbar } from "@/components/shared/layout/Navbar";
import { Providers } from "@/components/shared/providers";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Researcher Platform",
  description: "Academic research collaboration platform for UMD/AIM/UMIACS.",
};

type ThemeMode = "light" | "dark";
type UserRole = "student" | "faculty" | "researcher" | "coordinator" | "unverified" | null;

function resolveTheme(value: string | undefined): ThemeMode {
  return value === "dark" ? "dark" : "light";
}

function normalizeRole(value: string | null | undefined): UserRole {
  if (
    value === "student" ||
    value === "faculty" ||
    value === "researcher" ||
    value === "coordinator" ||
    value === "unverified"
  ) {
    return value;
  }

  return null;
}

function normalizeInstitutionalVerified(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  return null;
}

function isFacultyRole(role: UserRole) {
  return role === "faculty" || role === "researcher" || role === "coordinator";
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = resolveTheme(cookieStore.get("theme")?.value);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role = normalizeRole(
    user?.app_metadata && typeof user.app_metadata === "object" && "role" in user.app_metadata
      ? String(user.app_metadata.role)
      : null,
  );

  let institutionalVerified = normalizeInstitutionalVerified(
    user?.app_metadata &&
      typeof user.app_metadata === "object" &&
      "institutional_verified" in user.app_metadata
      ? user.app_metadata.institutional_verified
      : null,
  );

  if (user && (!role || institutionalVerified === null)) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("role, institutional_verified")
      .eq("id", user.id)
      .maybeSingle();

    role = role ?? normalizeRole(profileRow?.role ?? null);
    institutionalVerified = institutionalVerified ?? profileRow?.institutional_verified ?? false;
  }

  let pendingSignalCount = 0;
  let recentReviewedSignalCount = 0;
  if (user && isFacultyRole(role)) {
    const { count } = await supabase
      .from("interest_signals")
      .select("id", { count: "exact", head: true })
      .eq("faculty_id", user.id)
      .eq("status", "pending");

    pendingSignalCount = count ?? 0;
  }

  if (user && role === "student" && institutionalVerified) {
    const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("interest_signals")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.id)
      .eq("status", "reviewed")
      .gte("reviewed_at", sevenDaysAgoIso);

    recentReviewedSignalCount = count ?? 0;
  }

  return (
    <html lang="en" data-theme={theme}>
      <body className={`${geist.variable} ${instrumentSerif.variable}`}>
        <Providers>
          <div className="flex min-h-screen flex-col bg-background text-foreground">
            <Navbar
              user={
                user
                  ? {
                      email: user.email ?? null,
                      role,
                      institutionalVerified: Boolean(institutionalVerified),
                      pendingSignalCount,
                      recentReviewedSignalCount,
                    }
                  : null
              }
              initialTheme={theme}
            />
            <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
