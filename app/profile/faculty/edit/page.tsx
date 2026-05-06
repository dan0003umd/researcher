import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FacultyProfileEditForm } from "@/app/profile/faculty/edit/FacultyProfileEditForm";
import { createClient } from "@/lib/supabase/server";
import { appRouter } from "@/server/routers";
import { createTRPCContext } from "@/server/trpc";

type UserRole = "student" | "faculty" | "researcher" | "coordinator" | "unverified" | null;

type FacultyProfileEditPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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

async function createFacultyProfileEditCaller() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host") ?? "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const cookie = headerStore.get("cookie") ?? "";

  const request = new Request(`${protocol}://${host}/profile/faculty/edit`, {
    headers: cookie ? { cookie } : undefined,
  });

  const context = await createTRPCContext({
    req: request,
    resHeaders: new Headers(),
  });

  return appRouter.createCaller(context);
}

export default async function FacultyProfileEditPage({ searchParams }: FacultyProfileEditPageProps) {
  const resolvedSearchParams = await searchParams;
  const noticeParam = resolvedSearchParams.notice;
  const notice = Array.isArray(noticeParam) ? noticeParam[0] : noticeParam;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/profile/faculty/edit");
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

  if (resolvedRole === "student") {
    redirect("/profile/edit");
  }

  if (resolvedRole !== "faculty" && resolvedRole !== "researcher" && resolvedRole !== "coordinator") {
    redirect("/dashboard");
  }

  const caller = await createFacultyProfileEditCaller();
  const [initialProfile, interestGroups, skillGroups] = await Promise.all([
    caller.profile.getMyFacultyProfile(),
    caller.profile.getResearchInterests(),
    caller.profile.getSkills(),
  ]);

  const initialNotice =
    notice === "faculty-edit-coming-soon" ? "Faculty edit coming soon" : undefined;

  return (
    <FacultyProfileEditForm
      initialProfile={initialProfile}
      interestGroups={interestGroups}
      skillGroups={skillGroups}
      initialNotice={initialNotice}
    />
  );
}
