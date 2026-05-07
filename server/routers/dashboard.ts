import { TRPCError } from "@trpc/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { availabilityOptions, experienceLevelOptions } from "@/lib/validators/profile";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";

type ProfileRole = "student" | "faculty" | "researcher" | "coordinator" | "unverified";
type FacultyRole = "faculty" | "researcher" | "coordinator";
type UserRole = ProfileRole | null;

type StudentProfileRow = {
  user_id: string;
  display_name: string;
  year_level: string | null;
  degree_type: string | null;
  department: string | null;
  availability: (typeof availabilityOptions)[number];
  experience_level: (typeof experienceLevelOptions)[number];
  preferred_collaboration_type: Array<
    | "research_assistant"
    | "co_author"
    | "project_lead"
    | "independent_project"
    | "thesis_collaboration"
    | "casual_mentorship"
  >;
  lab_experience: boolean;
  bio: string | null;
};

type FacultyProfileRow = {
  user_id: string;
  display_name: string;
  title: string | null;
  department: string | null;
  bio: string | null;
  currently_recruiting: boolean;
  recruiting_message: string | null;
  desired_experience_level: "any" | "beginner" | "intermediate" | "advanced";
};

type InterestLinkRow = {
  user_id: string;
  interest_id: number;
  is_primary: boolean;
};

type InterestRow = {
  id: number;
  name: string;
  category: string;
};

type SkillLinkRow = {
  user_id: string;
  skill_id: number;
};

type SkillRow = {
  id: number;
  name: string;
};

type SignalRow = {
  id: string;
  student_id: string | null;
  faculty_id: string | null;
  message: string | null;
  status: string | null;
  created_at: string | null;
};

const facultyRoles = new Set<FacultyRole>(["faculty", "researcher", "coordinator"]);

const studentMissingFieldConfig = [
  { key: "display_name", label: "Display name" },
  { key: "year_level", label: "Year level" },
  { key: "degree_type", label: "Degree type" },
  { key: "department", label: "Department" },
  { key: "bio", label: "Bio" },
  { key: "interests", label: "Research interests" },
  { key: "skills", label: "Skills" },
  { key: "preferred_collaboration_type", label: "Collaboration preferences" },
] as const;

const facultyMissingFieldConfig = [
  { key: "display_name", label: "Display name" },
  { key: "title", label: "Title" },
  { key: "department", label: "Department" },
  { key: "bio", label: "Bio" },
  { key: "interests", label: "Research interests" },
  { key: "skills", label: "Desired skills" },
] as const;

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

function normalizeSignalStatus(value: string | null): "pending" | "reviewed" | "archived" {
  if (value === "reviewed" || value === "archived") {
    return value;
  }

  return "pending";
}

function resolveDisplayNameFromEmail(email: string | undefined) {
  if (!email) {
    return "there";
  }

  const localPart = email.split("@")[0] ?? "there";
  const normalized = localPart.replace(/[._-]+/g, " ").trim();

  if (normalized.length === 0) {
    return "there";
  }

  return normalized
    .split(" ")
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}

function resolveUserMeta(params: {
  appMetadata: unknown;
}): { roleFromMeta: UserRole; institutionalVerifiedFromMeta: boolean | null } {
  if (!params.appMetadata || typeof params.appMetadata !== "object") {
    return { roleFromMeta: null, institutionalVerifiedFromMeta: null };
  }

  const meta = params.appMetadata as Record<string, unknown>;
  const roleFromMeta = normalizeRole(typeof meta.role === "string" ? meta.role : null);
  const institutionalVerifiedFromMeta =
    typeof meta.institutional_verified === "boolean" ? meta.institutional_verified : null;

  return {
    roleFromMeta,
    institutionalVerifiedFromMeta,
  };
}

async function resolveRoleAndVerification(params: {
  userId: string;
  appMetadata: unknown;
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/trpc-server").createTRPCServerClient>>;
}) {
  const { roleFromMeta, institutionalVerifiedFromMeta } = resolveUserMeta({
    appMetadata: params.appMetadata,
  });

  let role = roleFromMeta;
  let institutionalVerified = institutionalVerifiedFromMeta;

  if (!role || institutionalVerified === null) {
    const { data: profileRow, error: profileError } = await params.supabase
      .from("profiles")
      .select("role, institutional_verified")
      .eq("id", params.userId)
      .maybeSingle();

    if (profileError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not resolve role for dashboard.",
      });
    }

    if (!role) {
      role = normalizeRole(profileRow?.role ?? null);
    }

    if (institutionalVerified === null) {
      institutionalVerified = profileRow?.institutional_verified ?? false;
    }
  }

  return {
    role,
    institutionalVerified: Boolean(institutionalVerified),
  };
}

async function loadInterestMapByUserIds(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, Array<{ id: number; name: string; category: string; isPrimary: boolean }>>();
  }

  const adminClient = createAdminClient();

  const { data: links, error: linksError } = await adminClient
    .from("profile_research_interests")
    .select("user_id, interest_id, is_primary")
    .in("user_id", userIds);

  if (linksError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not load interest mappings.",
    });
  }

  const interestIds = Array.from(new Set((links ?? []).map((row) => row.interest_id)));

  if (interestIds.length === 0) {
    return new Map<string, Array<{ id: number; name: string; category: string; isPrimary: boolean }>>();
  }

  const { data: interests, error: interestsError } = await adminClient
    .from("research_interests")
    .select("id, name, category")
    .in("id", interestIds);

  if (interestsError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not load interest metadata.",
    });
  }

  const interestById = new Map<number, InterestRow>();
  (interests ?? []).forEach((interest) => {
    interestById.set(interest.id, interest);
  });

  const map = new Map<string, Array<{ id: number; name: string; category: string; isPrimary: boolean }>>();

  (links as InterestLinkRow[] | null)?.forEach((link) => {
    const interest = interestById.get(link.interest_id);
    if (!interest) {
      return;
    }

    const existing = map.get(link.user_id) ?? [];
    existing.push({
      id: interest.id,
      name: interest.name,
      category: interest.category,
      isPrimary: link.is_primary,
    });
    map.set(link.user_id, existing);
  });

  map.forEach((items) => {
    items.sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) {
        return a.isPrimary ? -1 : 1;
      }

      return a.name.localeCompare(b.name);
    });
  });

  return map;
}

async function loadSkillMapByUserIds(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, Array<{ id: number; name: string }>>();
  }

  const adminClient = createAdminClient();
  const { data: links, error: linksError } = await adminClient
    .from("profile_skills")
    .select("user_id, skill_id")
    .in("user_id", userIds);

  if (linksError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not load skill mappings.",
    });
  }

  const skillIds = Array.from(new Set((links ?? []).map((row) => row.skill_id)));

  if (skillIds.length === 0) {
    return new Map<string, Array<{ id: number; name: string }>>();
  }

  const { data: skills, error: skillsError } = await adminClient
    .from("skills")
    .select("id, name")
    .in("id", skillIds);

  if (skillsError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not load skill metadata.",
    });
  }

  const skillById = new Map<number, SkillRow>();
  (skills ?? []).forEach((skill) => {
    skillById.set(skill.id, skill);
  });

  const map = new Map<string, Array<{ id: number; name: string }>>();
  (links as SkillLinkRow[] | null)?.forEach((link) => {
    const skill = skillById.get(link.skill_id);
    if (!skill) {
      return;
    }

    const existing = map.get(link.user_id) ?? [];
    existing.push({
      id: skill.id,
      name: skill.name,
    });
    map.set(link.user_id, existing);
  });

  map.forEach((items) => {
    items.sort((a, b) => a.name.localeCompare(b.name));
  });

  return map;
}

async function loadStudentCompleteness(params: {
  userId: string;
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/trpc-server").createTRPCServerClient>>;
}) {
  const { data: profile, error: profileError } = await params.supabase
    .from("student_profiles")
    .select(
      "user_id, display_name, year_level, degree_type, department, availability, experience_level, preferred_collaboration_type, lab_experience, bio",
    )
    .eq("user_id", params.userId)
    .maybeSingle();

  if (profileError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not load student profile completeness.",
    });
  }

  if (!profile) {
    return {
      percentage: 0,
      missing: studentMissingFieldConfig.map((item) => item.label),
      hasProfile: false,
      profile: null as StudentProfileRow | null,
    };
  }

  const [interestMap, skillMap] = await Promise.all([
    loadInterestMapByUserIds([params.userId]),
    loadSkillMapByUserIds([params.userId]),
  ]);

  const interests = interestMap.get(params.userId) ?? [];
  const skills = skillMap.get(params.userId) ?? [];

  const checks = [
    { label: "Display name", complete: profile.display_name.trim().length > 0 },
    { label: "Year level", complete: Boolean(profile.year_level) },
    { label: "Degree type", complete: Boolean(profile.degree_type) },
    { label: "Department", complete: Boolean(profile.department?.trim()) },
    { label: "Bio", complete: Boolean(profile.bio?.trim()) },
    { label: "Research interests", complete: interests.length > 0 },
    { label: "Skills", complete: skills.length > 0 },
    {
      label: "Collaboration preferences",
      complete: Array.isArray(profile.preferred_collaboration_type) && profile.preferred_collaboration_type.length > 0,
    },
  ];

  const completeCount = checks.filter((check) => check.complete).length;
  const percentage = Math.round((completeCount / checks.length) * 100);

  return {
    percentage,
    missing: checks.filter((check) => !check.complete).map((check) => check.label),
    hasProfile: true,
    profile: profile as StudentProfileRow,
    interests,
    skills,
  };
}

async function loadFacultyCompleteness(params: {
  userId: string;
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/trpc-server").createTRPCServerClient>>;
}) {
  const { data: profile, error: profileError } = await params.supabase
    .from("faculty_profiles")
    .select(
      "user_id, display_name, title, department, bio, currently_recruiting, recruiting_message, desired_experience_level",
    )
    .eq("user_id", params.userId)
    .maybeSingle();

  if (profileError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not load faculty profile completeness.",
    });
  }

  if (!profile) {
    return {
      percentage: 0,
      missing: facultyMissingFieldConfig.map((item) => item.label),
      hasProfile: false,
      profile: null as FacultyProfileRow | null,
      interests: [] as Array<{ id: number; name: string; category: string; isPrimary: boolean }>,
      skills: [] as Array<{ id: number; name: string }>,
    };
  }

  const [interestMap, skillMap] = await Promise.all([
    loadInterestMapByUserIds([params.userId]),
    loadSkillMapByUserIds([params.userId]),
  ]);

  const interests = interestMap.get(params.userId) ?? [];
  const skills = skillMap.get(params.userId) ?? [];

  const checks = [
    { label: "Display name", complete: profile.display_name.trim().length > 0 },
    { label: "Title", complete: Boolean(profile.title?.trim()) },
    { label: "Department", complete: Boolean(profile.department?.trim()) },
    { label: "Bio", complete: Boolean(profile.bio?.trim()) },
    { label: "Research interests", complete: interests.length > 0 },
    { label: "Desired skills", complete: skills.length > 0 },
  ];

  const completeCount = checks.filter((check) => check.complete).length;
  const percentage = Math.round((completeCount / checks.length) * 100);

  return {
    percentage,
    missing: checks.filter((check) => !check.complete).map((check) => check.label),
    hasProfile: true,
    profile: profile as FacultyProfileRow,
    interests,
    skills,
  };
}

async function loadMatchedLabsForStudent(params: {
  userId: string;
  studentInterestIds: number[];
}) {
  if (params.studentInterestIds.length === 0) {
    return [];
  }

  const adminClient = createAdminClient();
  const { data: featuredLabs, error: featuredError } = await adminClient
    .from("faculty_profiles")
    .select(
      "user_id, display_name, lab_name, department, bio, currently_recruiting, desired_experience_level, recruiting_message, updated_at",
    )
    .order("currently_recruiting", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(18);

  if (featuredError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not load matched labs.",
    });
  }

  const facultyRows = featuredLabs ?? [];
  if (facultyRows.length === 0) {
    return [];
  }

  const facultyIds = facultyRows.map((row) => row.user_id);
  const { data: verifiedProfiles, error: verifiedError } = await adminClient
    .from("profiles")
    .select("id, role")
    .in("id", facultyIds)
    .eq("institutional_verified", true);

  if (verifiedError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not validate faculty profiles.",
    });
  }

  const verifiedFacultyIds = new Set(
    (verifiedProfiles ?? [])
      .filter((profile) => profile.role === "faculty" || profile.role === "researcher" || profile.role === "coordinator")
      .map((profile) => profile.id),
  );

  const { data: matchingInterestLinks, error: matchingInterestError } = await adminClient
    .from("profile_research_interests")
    .select("user_id, interest_id")
    .in("user_id", facultyIds)
    .in("interest_id", params.studentInterestIds);

  if (matchingInterestError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not apply lab interest matching.",
    });
  }

  const matchedFacultyIds = new Set((matchingInterestLinks ?? []).map((row) => row.user_id));
  const labInterestMap = await loadInterestMapByUserIds(facultyIds);

  return facultyRows
    .filter((row) => verifiedFacultyIds.has(row.user_id) && matchedFacultyIds.has(row.user_id))
    .slice(0, 3)
    .map((row) => ({
      id: row.user_id,
      piName: row.display_name,
      labName: row.lab_name,
      department: row.department,
      bio: row.bio,
      recruitingMessage: row.recruiting_message,
      currentlyRecruiting: row.currently_recruiting,
      experienceLevelSought: row.desired_experience_level,
      interests: labInterestMap.get(row.user_id) ?? [],
      desiredSkills: [],
      verified: true,
    }));
}

async function loadStudentSignals(params: { userId: string }) {
  const adminClient = createAdminClient();
  const { data: signals, error: signalsError } = await adminClient
    .from("interest_signals")
    .select("id, faculty_id, status, created_at")
    .eq("student_id", params.userId)
    .order("created_at", { ascending: false });

  if (signalsError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not load your interest signals.",
    });
  }

  const facultyIds = Array.from(new Set((signals ?? []).map((signal) => signal.faculty_id).filter(Boolean)));
  let labNameByFacultyId = new Map<string, string>();

  if (facultyIds.length > 0) {
    const { data: facultyProfiles, error: facultyProfilesError } = await adminClient
      .from("faculty_profiles")
      .select("user_id, lab_name, display_name")
      .in("user_id", facultyIds as string[]);

    if (facultyProfilesError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not load signaled lab details.",
      });
    }

    labNameByFacultyId = new Map(
      (facultyProfiles ?? []).map((profile) => [
        profile.user_id,
        profile.lab_name?.trim() || `${profile.display_name}'s Lab`,
      ]),
    );
  }

  return (signals ?? []).map((signal) => ({
    id: signal.id,
    facultyId: signal.faculty_id ?? "",
    labName: signal.faculty_id ? labNameByFacultyId.get(signal.faculty_id) ?? "Lab" : "Lab",
    sentAt: signal.created_at ?? new Date().toISOString(),
    status: normalizeSignalStatus(signal.status),
  }));
}

async function loadFacultySignalSummary(params: { userId: string }) {
  const adminClient = createAdminClient();
  const { data: signals, error: signalsError } = await adminClient
    .from("interest_signals")
    .select("id, student_id, message, status, created_at")
    .eq("faculty_id", params.userId)
    .order("created_at", { ascending: false });

  if (signalsError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not load faculty signal summary.",
    });
  }

  const studentIds = Array.from(new Set((signals ?? []).map((signal) => signal.student_id).filter(Boolean)));

  let studentNameById = new Map<string, string>();
  if (studentIds.length > 0) {
    const { data: studentProfiles, error: studentProfilesError } = await adminClient
      .from("student_profiles")
      .select("user_id, display_name")
      .in("user_id", studentIds as string[]);

    if (studentProfilesError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not load signal preview student names.",
      });
    }

    studentNameById = new Map((studentProfiles ?? []).map((profile) => [profile.user_id, profile.display_name]));
  }

  const normalizedSignals = (signals as SignalRow[]).map((signal) => ({
    id: signal.id,
    studentId: signal.student_id ?? "",
    studentName: signal.student_id ? studentNameById.get(signal.student_id) ?? "Student" : "Student",
    message: signal.message ?? "",
    status: normalizeSignalStatus(signal.status),
    createdAt: signal.created_at ?? new Date().toISOString(),
  }));

  return {
    pendingCount: normalizedSignals.filter((signal) => signal.status === "pending").length,
    latestSignals: normalizedSignals.slice(0, 3),
  };
}

async function computeProfileCompletenessByRole(params: {
  role: UserRole;
  userId: string;
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/trpc-server").createTRPCServerClient>>;
}) {
  if (params.role === "student") {
    const student = await loadStudentCompleteness({
      userId: params.userId,
      supabase: params.supabase,
    });

    return {
      percentage: student.percentage,
      missing: student.missing,
      hasProfile: student.hasProfile,
      student,
      faculty: null as null,
    };
  }

  if (params.role && facultyRoles.has(params.role as FacultyRole)) {
    const faculty = await loadFacultyCompleteness({
      userId: params.userId,
      supabase: params.supabase,
    });

    return {
      percentage: faculty.percentage,
      missing: faculty.missing,
      hasProfile: faculty.hasProfile,
      student: null as null,
      faculty,
    };
  }

  return {
    percentage: 0,
    missing: [] as string[],
    hasProfile: false,
    student: null as null,
    faculty: null as null,
  };
}

export const dashboardRouter = createTRPCRouter({
  getProfileCompleteness: protectedProcedure.query(async ({ ctx }) => {
    const { role } = await resolveRoleAndVerification({
      userId: ctx.user.id,
      appMetadata: ctx.user.app_metadata,
      supabase: ctx.supabase,
    });

    const completeness = await computeProfileCompletenessByRole({
      role,
      userId: ctx.user.id,
      supabase: ctx.supabase,
    });

    return {
      percentage: completeness.percentage,
      missing: completeness.missing,
    };
  }),

  getDashboardData: protectedProcedure.query(async ({ ctx }) => {
    const { role, institutionalVerified } = await resolveRoleAndVerification({
      userId: ctx.user.id,
      appMetadata: ctx.user.app_metadata,
      supabase: ctx.supabase,
    });

    const completeness = await computeProfileCompletenessByRole({
      role,
      userId: ctx.user.id,
      supabase: ctx.supabase,
    });

    const displayName =
      completeness.student?.profile?.display_name ??
      completeness.faculty?.profile?.display_name ??
      resolveDisplayNameFromEmail(ctx.user.email);

    const base = {
      role,
      institutionalVerified,
      displayName,
      profileCompleteness: {
        percentage: completeness.percentage,
        missing: completeness.missing,
      },
      hasProfile: completeness.hasProfile,
      profileSetupPath:
        role === "student"
          ? "/onboarding/profile"
          : role && facultyRoles.has(role as FacultyRole)
            ? "/onboarding/faculty-profile"
            : null,
    };

    if (!institutionalVerified) {
      return {
        ...base,
        mode: "unverified" as const,
      };
    }

    if (role === "student") {
      if (!completeness.student?.hasProfile || !completeness.student.profile) {
        return {
          ...base,
          mode: "no_profile" as const,
        };
      }

      const studentInterestIds = (completeness.student.interests ?? []).map((interest) => interest.id);
      const [matchedLabs, sentSignals] = await Promise.all([
        loadMatchedLabsForStudent({
          userId: ctx.user.id,
          studentInterestIds,
        }),
        loadStudentSignals({ userId: ctx.user.id }),
      ]);

      return {
        ...base,
        mode: "student" as const,
        student: {
          matchedLabs,
          sentSignals,
        },
      };
    }

    if (role && facultyRoles.has(role as FacultyRole)) {
      if (!completeness.faculty?.hasProfile || !completeness.faculty.profile) {
        return {
          ...base,
          mode: "no_profile" as const,
        };
      }

      const signalSummary = await loadFacultySignalSummary({ userId: ctx.user.id });

      return {
        ...base,
        mode: "faculty" as const,
        faculty: {
          currentlyRecruiting: completeness.faculty.profile.currently_recruiting,
          recruitingMessage: completeness.faculty.profile.recruiting_message,
          pendingSignalCount: signalSummary.pendingCount,
          latestSignals: signalSummary.latestSignals,
        },
      };
    }

    return {
      ...base,
      mode: "no_profile" as const,
    };
  }),
});
