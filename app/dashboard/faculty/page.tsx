import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FlaskConical } from "lucide-react";
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
    <section className="dashboard-surface -mx-6 space-y-6 px-6 pb-6">
      <header className="-mx-6 rounded-b-2xl bg-[linear-gradient(135deg,#1e3a5f_0%,#2d5282_100%)] px-8 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-[var(--font-display)] text-2xl font-normal text-white">Lab Dashboard</h1>
            <p className="text-[0.875rem] text-white/80">
              {labSummary.labName ?? "Research Lab"} · {labSummary.department ?? "Department"}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/80 px-3 py-1 text-xs font-semibold text-white">
            <FlaskConical className="h-3.5 w-3.5" />
            Faculty
          </span>
        </div>
      </header>

      <FacultyDashboardClient
        labSummary={labSummary}
        initialSignals={initialSignals}
      />
    </section>
  );
}
