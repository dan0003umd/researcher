import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { StudentProfileEditForm } from "@/app/profile/edit/StudentProfileEditForm";
import { createClient } from "@/lib/supabase/server";
import { appRouter } from "@/server/routers";
import { createTRPCContext } from "@/server/trpc";

type UserRole = "student" | "faculty" | "researcher" | "coordinator" | "unverified" | null;

function normalizeRole(value: unknown): UserRole {
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

async function createProfileEditCaller() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host") ?? "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const cookie = headerStore.get("cookie") ?? "";

  const request = new Request(`${protocol}://${host}/profile/edit`, {
    headers: cookie ? { cookie } : undefined,
  });

  const context = await createTRPCContext({
    req: request,
    resHeaders: new Headers(),
  });

  return appRouter.createCaller(context);
}

export default async function StudentProfileEditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/profile/edit");
  }

  const metadataRole =
    user.app_metadata && typeof user.app_metadata === "object" && "role" in user.app_metadata
      ? normalizeRole(String((user.app_metadata as Record<string, unknown>).role))
      : null;

  const metadataInstitutionalVerified =
    user.app_metadata &&
    typeof user.app_metadata === "object" &&
    "institutional_verified" in user.app_metadata
      ? Boolean((user.app_metadata as Record<string, unknown>).institutional_verified)
      : null;

  let resolvedRole = metadataRole;
  let institutionalVerified = metadataInstitutionalVerified;

  if (!resolvedRole || institutionalVerified === null) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("role, institutional_verified")
      .eq("id", user.id)
      .maybeSingle();

    resolvedRole = resolvedRole ?? normalizeRole(profileRow?.role ?? null);
    institutionalVerified = institutionalVerified ?? Boolean(profileRow?.institutional_verified);
  }

  if (!institutionalVerified) {
    redirect("/onboarding/verify-email");
  }

  if (resolvedRole === "faculty" || resolvedRole === "researcher" || resolvedRole === "coordinator") {
    redirect("/profile/faculty/edit?notice=faculty-edit-coming-soon");
  }

  if (resolvedRole !== "student") {
    redirect("/dashboard");
  }

  const caller = await createProfileEditCaller();
  const [initialProfile, interestGroups, skillGroups] = await Promise.all([
    caller.profile.getMyStudentProfile(),
    caller.profile.getResearchInterests(),
    caller.profile.getSkills(),
  ]);

  return (
    <StudentProfileEditForm
      initialProfile={initialProfile}
      interestGroups={interestGroups}
      skillGroups={skillGroups}
    />
  );
}
