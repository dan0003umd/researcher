import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { cookies } from "next/headers";
import { Footer } from "@/components/shared/layout/Footer";
import { Navbar } from "@/components/shared/layout/Navbar";
import { Providers } from "@/components/shared/providers";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
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

  if (user && !role) {
    const { data: profileRow } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    role = normalizeRole(profileRow?.role ?? null);
  }

  let pendingSignalCount = 0;
  if (user && isFacultyRole(role)) {
    const { count } = await supabase
      .from("interest_signals")
      .select("id", { count: "exact", head: true })
      .eq("faculty_id", user.id)
      .eq("status", "pending");

    pendingSignalCount = count ?? 0;
  }

  return (
    <html lang="en" data-theme={theme}>
      <body className={`${inter.variable} ${instrumentSerif.variable}`}>
        <Providers>
          <div className="flex min-h-screen flex-col bg-background text-foreground">
            <Navbar
              user={
                user
                  ? {
                      email: user.email ?? null,
                      role,
                      pendingSignalCount,
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
