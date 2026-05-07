import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FacultyDashboardClient } from "@/app/dashboard/faculty/FacultyDashboardClient";
import { createClient } from "@/lib/supabase/server";
import { appRouter } from "@/server/routers";
import { createTRPCContext } from "@/server/trpc";

const allowedFacultyRoles = new Set(["faculty", "researcher", "coordinator"]);

async function createFacultyCaller() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host") ?? "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const cookie = headerStore.get("cookie") ?? "";

  const request = new Request(`${protocol}://${host}/dashboard/faculty`, {
    headers: cookie ? { cookie } : undefined,
  });

  const context = await createTRPCContext({
    req: request,
    resHeaders: new Headers(),
  });

  return appRouter.createCaller(context);
}

export default async function FacultyDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/dashboard/faculty");
  }

  const metadataRole =
    user.app_metadata && typeof user.app_metadata === "object" && "role" in user.app_metadata
      ? String((user.app_metadata as Record<string, unknown>).role)
      : null;

  let resolvedRole = metadataRole;
  if (!resolvedRole) {
    const { data: ownProfile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    resolvedRole = ownProfile?.role ?? null;
  }

  if (!resolvedRole || !allowedFacultyRoles.has(resolvedRole)) {
    redirect("/dashboard");
  }

  const caller = await createFacultyCaller();
  let labSummary: Awaited<ReturnType<typeof caller.faculty.getMyLabSummary>>;
  try {
    labSummary = await caller.faculty.getMyLabSummary();
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("not found")) {
      redirect("/onboarding/faculty-profile");
    }

    throw error;
  }

  const initialSignals = await caller.faculty.getMyInterestSignals();

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">Faculty Dashboard</p>
        <h1 className="text-3xl font-semibold tracking-tight">Student Interest and Discovery</h1>
        <p className="text-sm text-muted-foreground">
          Review incoming signals and browse verified student profiles.
        </p>
      </header>

      <FacultyDashboardClient
        labSummary={labSummary}
        initialSignals={initialSignals}
      />
    </section>
  );
}
