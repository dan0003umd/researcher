import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { availabilityOptions, experienceLevelOptions } from "@/lib/validators/profile";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";

const allowedFacultyRoles = new Set(["faculty", "researcher", "coordinator"]);

const signalStatusOptions = ["reviewed", "archived"] as const;

const updateSignalStatusInputSchema = z.object({
  signalId: z.string().uuid("Invalid signal id."),
  status: z.enum(signalStatusOptions),
});

const browseStudentsInputSchema = z.object({
  search: z.string().trim().max(120).optional(),
  interests: z.array(z.number().int().positive()).optional(),
  experienceLevel: z.enum(experienceLevelOptions).optional(),
  availability: z.enum(availabilityOptions).optional(),
});

type StudentProfileRow = {
  user_id: string;
  display_name: string;
  degree_type: string | null;
  year_level: string | null;
  department: string | null;
  availability: (typeof availabilityOptions)[number];
  experience_level: (typeof experienceLevelOptions)[number];
  bio: string | null;
  updated_at: string;
};

type SignalRow = {
  id: string;
  student_id: string | null;
  faculty_id: string | null;
  message: string | null;
  status: string | null;
  created_at: string | null;
};

type InterestLinkRow = {
  user_id: string;
  interest_id: number;
  is_primary: boolean;
};

type InterestRow = {
  id: number;
  name: string;
};

type SkillLinkRow = {
  user_id: string;
  skill_id: number;
  proficiency_level: "beginner" | "intermediate" | "advanced" | "expert";
};

type SkillRow = {
  id: number;
  name: string;
};

function normalizeSignalStatus(value: string | null): "pending" | "reviewed" | "archived" {
  if (value === "reviewed" || value === "archived") {
    return value;
  }

  return "pending";
}

async function resolveCurrentRole(params: {
  appMetadata: unknown;
  userId: string;
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/trpc-server").createTRPCServerClient>>;
}) {
  const metadataRole =
    params.appMetadata && typeof params.appMetadata === "object" && "role" in params.appMetadata
      ? String((params.appMetadata as Record<string, unknown>).role)
      : null;

  if (metadataRole) {
    return metadataRole;
  }

  const { data, error } = await params.supabase
    .from("profiles")
    .select("role")
    .eq("id", params.userId)
    .maybeSingle();

  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not resolve your role.",
    });
  }

  return data?.role ?? null;
}

async function assertFacultyAccess(params: {
  appMetadata: unknown;
  userId: string;
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/trpc-server").createTRPCServerClient>>;
}) {
  const role = await resolveCurrentRole(params);

  if (!role || !allowedFacultyRoles.has(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Faculty dashboard access is restricted.",
    });
  }
}

async function loadVerifiedStudentIds(userIds: string[]) {
  if (userIds.length === 0) {
    return new Set<string>();
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("profiles")
    .select("id")
    .in("id", userIds)
    .eq("institutional_verified", true)
    .eq("role", "student");

  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not load verified student list.",
    });
  }

  return new Set((data ?? []).map((row) => row.id));
}

async function loadStudentInterestMap(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, Array<{ id: number; name: string; isPrimary: boolean }>>();
  }

  const adminClient = createAdminClient();
  const { data: links, error: linksError } = await adminClient
    .from("profile_research_interests")
    .select("user_id, interest_id, is_primary")
    .in("user_id", userIds);

  if (linksError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not load student interests.",
    });
  }

  const interestIds = Array.from(new Set((links ?? []).map((row) => row.interest_id)));

  if (interestIds.length === 0) {
    return new Map<string, Array<{ id: number; name: string; isPrimary: boolean }>>();
  }

  const { data: interestRows, error: interestRowsError } = await adminClient
    .from("research_interests")
    .select("id, name")
    .in("id", interestIds);

  if (interestRowsError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not load interest metadata.",
    });
  }

  const interestNameById = new Map<number, string>();
  (interestRows as InterestRow[] | null)?.forEach((row) => {
    interestNameById.set(row.id, row.name);
  });

  const map = new Map<string, Array<{ id: number; name: string; isPrimary: boolean }>>();

  (links as InterestLinkRow[] | null)?.forEach((link) => {
    const name = interestNameById.get(link.interest_id);

    if (!name) {
      return;
    }

    const existing = map.get(link.user_id) ?? [];
    existing.push({
      id: link.interest_id,
      name,
      isPrimary: link.is_primary,
    });
    map.set(link.user_id, existing);
  });

  map.forEach((interests) => {
    interests.sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) {
        return a.isPrimary ? -1 : 1;
      }

      return a.name.localeCompare(b.name);
    });
  });

  return map;
}

async function loadStudentSkillMap(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, Array<{ id: number; name: string; proficiencyLevel: string }>>();
  }

  const adminClient = createAdminClient();
  const { data: links, error: linksError } = await adminClient
    .from("profile_skills")
    .select("user_id, skill_id, proficiency_level")
    .in("user_id", userIds);

  if (linksError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not load student skills.",
    });
  }

  const skillIds = Array.from(new Set((links ?? []).map((row) => row.skill_id)));

  if (skillIds.length === 0) {
    return new Map<string, Array<{ id: number; name: string; proficiencyLevel: string }>>();
  }

  const { data: skillRows, error: skillRowsError } = await adminClient
    .from("skills")
    .select("id, name")
    .in("id", skillIds);

  if (skillRowsError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not load skill metadata.",
    });
  }

  const skillNameById = new Map<number, string>();
  (skillRows as SkillRow[] | null)?.forEach((row) => {
    skillNameById.set(row.id, row.name);
  });

  const map = new Map<string, Array<{ id: number; name: string; proficiencyLevel: string }>>();

  (links as SkillLinkRow[] | null)?.forEach((link) => {
    const name = skillNameById.get(link.skill_id);

    if (!name) {
      return;
    }

    const existing = map.get(link.user_id) ?? [];
    existing.push({
      id: link.skill_id,
      name,
      proficiencyLevel: link.proficiency_level,
    });
    map.set(link.user_id, existing);
  });

  map.forEach((skills) => {
    skills.sort((a, b) => a.name.localeCompare(b.name));
  });

  return map;
}

export const facultyRouter = createTRPCRouter({
  getMyInterestSignals: protectedProcedure.query(async ({ ctx }) => {
    await assertFacultyAccess({
      appMetadata: ctx.user.app_metadata,
      userId: ctx.user.id,
      supabase: ctx.supabase,
    });

    const adminClient = createAdminClient();
    const { data: signals, error: signalsError } = await adminClient
      .from("interest_signals")
      .select("id, student_id, faculty_id, message, status, created_at")
      .eq("faculty_id", ctx.user.id)
      .order("created_at", { ascending: false });

    if (signalsError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not load interest signals.",
      });
    }

    const studentIds = Array.from(new Set((signals ?? []).map((signal) => signal.student_id).filter(Boolean)));

    if (studentIds.length === 0) {
      return [];
    }

    const [verifiedStudentIds, interestMap] = await Promise.all([
      loadVerifiedStudentIds(studentIds as string[]),
      loadStudentInterestMap(studentIds as string[]),
    ]);

    const { data: studentProfiles, error: studentProfilesError } = await adminClient
      .from("student_profiles")
      .select("user_id, display_name, degree_type, year_level")
      .in("user_id", studentIds as string[]);

    if (studentProfilesError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not load student profile details.",
      });
    }

    const profileByUserId = new Map<
      string,
      { user_id: string; display_name: string; degree_type: string | null; year_level: string | null }
    >();
    (studentProfiles ?? []).forEach((profile) => {
      profileByUserId.set(profile.user_id, profile);
    });

    return (signals as SignalRow[])
      .filter((signal) => signal.student_id && verifiedStudentIds.has(signal.student_id))
      .map((signal) => {
        const studentId = signal.student_id as string;
        const profile = profileByUserId.get(studentId);

        return {
          id: signal.id,
          studentId,
          studentName: profile?.display_name ?? "Student",
          degreeType: profile?.degree_type ?? "Not listed",
          yearLevel: profile?.year_level ?? "Not listed",
          message: signal.message ?? "",
          createdAt: signal.created_at ?? new Date().toISOString(),
          status: normalizeSignalStatus(signal.status),
          topInterests: (interestMap.get(studentId) ?? []).slice(0, 3).map((interest) => interest.name),
        };
      });
  }),

  updateSignalStatus: protectedProcedure
    .input(updateSignalStatusInputSchema)
    .mutation(async ({ ctx, input }) => {
      await assertFacultyAccess({
        appMetadata: ctx.user.app_metadata,
        userId: ctx.user.id,
        supabase: ctx.supabase,
      });

      const adminClient = createAdminClient();
      const { data: signal, error: signalError } = await adminClient
        .from("interest_signals")
        .select("id, faculty_id")
        .eq("id", input.signalId)
        .maybeSingle();

      if (signalError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not resolve this interest signal.",
        });
      }

      if (!signal || signal.faculty_id !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Interest signal not found.",
        });
      }

      const { error: updateError } = await adminClient
        .from("interest_signals")
        .update({
          status: input.status,
          reviewed_at: input.status === "reviewed" ? new Date().toISOString() : null,
        })
        .eq("id", input.signalId);

      if (updateError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not update signal status.",
        });
      }

      return { success: true };
    }),

  browseStudents: protectedProcedure
    .input(browseStudentsInputSchema)
    .query(async ({ ctx, input }) => {
      await assertFacultyAccess({
        appMetadata: ctx.user.app_metadata,
        userId: ctx.user.id,
        supabase: ctx.supabase,
      });

      const adminClient = createAdminClient();
      const { data: verifiedProfiles, error: verifiedProfilesError } = await adminClient
        .from("profiles")
        .select("id")
        .eq("institutional_verified", true)
        .eq("role", "student");

      if (verifiedProfilesError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not load verified students.",
        });
      }

      const verifiedIds = (verifiedProfiles ?? []).map((row) => row.id);

      if (verifiedIds.length === 0) {
        return [];
      }

      const searchTerm = input.search?.trim();
      let query = adminClient
        .from("student_profiles")
        .select(
          "user_id, display_name, degree_type, year_level, department, availability, experience_level, bio, updated_at",
        )
        .in("user_id", verifiedIds)
        .order("updated_at", { ascending: false })
        .limit(80);

      if (input.experienceLevel) {
        query = query.eq("experience_level", input.experienceLevel);
      }

      if (input.availability) {
        query = query.eq("availability", input.availability);
      }

      if (searchTerm) {
        query = query.or(
          `display_name.ilike.%${searchTerm}%,department.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`,
        );
      }

      const { data: studentRows, error: studentRowsError } = await query;

      if (studentRowsError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not load student results.",
        });
      }

      let filteredRows = (studentRows ?? []) as StudentProfileRow[];

      if ((input.interests ?? []).length > 0 && filteredRows.length > 0) {
        const candidateIds = filteredRows.map((row) => row.user_id);
        const { data: matchingInterestRows, error: matchingInterestError } = await adminClient
          .from("profile_research_interests")
          .select("user_id")
          .in("user_id", candidateIds)
          .in("interest_id", input.interests ?? []);

        if (matchingInterestError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not apply interest filters.",
          });
        }

        const matchingIds = new Set((matchingInterestRows ?? []).map((row) => row.user_id));
        filteredRows = filteredRows.filter((row) => matchingIds.has(row.user_id));
      }

      const studentIds = filteredRows.map((row) => row.user_id);
      const [interestMap, skillMap] = await Promise.all([
        loadStudentInterestMap(studentIds),
        loadStudentSkillMap(studentIds),
      ]);

      return filteredRows.map((row) => ({
        id: row.user_id,
        displayName: row.display_name,
        degreeType: row.degree_type ?? "Not listed",
        yearLevel: row.year_level ?? "Not listed",
        department: row.department ?? "Not listed",
        availability: row.availability,
        experienceLevel: row.experience_level,
        topInterests: (interestMap.get(row.user_id) ?? []).slice(0, 3).map((interest) => interest.name),
        topSkills: (skillMap.get(row.user_id) ?? []).slice(0, 2).map((skill) => skill.name),
      }));
    }),
});
