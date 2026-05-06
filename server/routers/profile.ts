import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  availabilityOptions,
  facultyProfileEditSchema,
  facultyProfileFormSchema,
  facultySoughtStudentLevelOptions,
  normalizeCollaborationTypes,
  skillSelectionSchema,
  skillProficiencyOptions,
  studentEditCollaborationTypeOptions,
  studentProfileEditSchema,
  studentProfileFormSchema,
  storedCollaborationTypeOptions,
} from "@/lib/validators/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";

const getGroupedResponse = <T extends { category: string }>(rows: T[]) => {
  const grouped = new Map<string, T[]>();

  rows.forEach((row) => {
    const existing = grouped.get(row.category) ?? [];
    existing.push(row);
    grouped.set(row.category, existing);
  });

  return Array.from(grouped.entries()).map(([category, items]) => ({
    category,
    items,
  }));
};

const studentProfileCreateInputSchema = studentProfileFormSchema;
const facultyProfileCreateInputSchema = facultyProfileFormSchema;
const studentProfileUpdateInputSchema = studentProfileEditSchema;
const facultyProfileUpdateInputSchema = facultyProfileEditSchema;

const createCustomInterestInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter an interest name.")
    .max(80, "Interest names must be 80 characters or less."),
});

const createCustomSkillInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a skill name.")
    .max(80, "Skill names must be 80 characters or less."),
});

const recruitingStatusInputSchema = z
  .object({
    recruiting: z.boolean(),
    message: z.string().trim().max(300).optional(),
  })
  .superRefine((value, context) => {
    if (value.recruiting && (!value.message || value.message.length === 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["message"],
        message: "Recruiting message is required when recruiting is enabled.",
      });
    }
  });

function cleanOptionalUrl(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanOptionalText(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapSoughtExperienceToStudentLevels(value: "any" | "beginner" | "intermediate" | "advanced") {
  if (value === "any") {
    return ["undergrad", "ms", "phd"] as Array<(typeof facultySoughtStudentLevelOptions)[number]>;
  }

  if (value === "beginner") {
    return ["undergrad"] as Array<(typeof facultySoughtStudentLevelOptions)[number]>;
  }

  if (value === "intermediate") {
    return ["undergrad", "ms"] as Array<(typeof facultySoughtStudentLevelOptions)[number]>;
  }

  return ["phd"] as Array<(typeof facultySoughtStudentLevelOptions)[number]>;
}

function mapStudentLevelsToSoughtExperience(levels: Array<(typeof facultySoughtStudentLevelOptions)[number]>) {
  const sorted = Array.from(new Set(levels)).sort();

  if (sorted.length === 3) {
    return "any" as const;
  }

  if (sorted.length === 1 && sorted[0] === "undergrad") {
    return "beginner" as const;
  }

  if (sorted.length === 1 && sorted[0] === "phd") {
    return "advanced" as const;
  }

  return "intermediate" as const;
}

function normalizeStudentCollaborationTypes(values: Array<(typeof studentEditCollaborationTypeOptions)[number]>) {
  const mapped = values.map((value) => (value === "project_lead" ? "independent_project" : value));
  return Array.from(new Set(mapped));
}

function normalizeRole(value: unknown) {
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

function normalizeSignalStatus(value: string | null | undefined) {
  if (value === "reviewed" || value === "archived") {
    return value;
  }

  return "pending" as const;
}

function normalizeCustomName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

async function replaceInterestSelections(
  userId: string,
  interests: Array<{ interestId: number; isPrimary: boolean }>,
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/trpc-server").createTRPCServerClient>>,
) {
  const { error: deleteError } = await supabase
    .from("profile_research_interests")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not update profile interests.",
    });
  }

  const { error: insertError } = await supabase.from("profile_research_interests").insert(
    interests.map((interest) => ({
      user_id: userId,
      interest_id: interest.interestId,
      is_primary: interest.isPrimary,
    })),
  );

  if (insertError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not save profile interests.",
    });
  }
}

async function replaceSkillSelections(
  userId: string,
  skills: Array<{ skillId: number; proficiencyLevel: (typeof skillProficiencyOptions)[number] }>,
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/trpc-server").createTRPCServerClient>>,
) {
  const { error: deleteError } = await supabase.from("profile_skills").delete().eq("user_id", userId);

  if (deleteError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not update profile skills.",
    });
  }

  const { error: insertError } = await supabase.from("profile_skills").insert(
    skills.map((skill) => ({
      user_id: userId,
      skill_id: skill.skillId,
      proficiency_level: skill.proficiencyLevel,
    })),
  );

  if (insertError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not save profile skills.",
    });
  }
}

export const profileRouter = createTRPCRouter({
  createCustomInterest: protectedProcedure
    .input(createCustomInterestInputSchema)
    .mutation(async ({ input }) => {
      const name = normalizeCustomName(input.name);
      const adminClient = createAdminClient();

      const { data: existingInterest, error: existingInterestError } = await adminClient
        .from("research_interests")
        .select("id, name, category, parent_id")
        .ilike("name", name)
        .order("parent_id", { ascending: true, nullsFirst: true })
        .limit(1)
        .maybeSingle();

      if (existingInterestError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not check existing interests.",
        });
      }

      if (existingInterest) {
        return existingInterest;
      }

      const { data: insertedInterest, error: insertInterestError } = await adminClient
        .from("research_interests")
        .insert({
          name,
          category: "Custom",
          parent_id: null,
        })
        .select("id, name, category, parent_id")
        .single();

      if (insertInterestError) {
        const duplicateName = insertInterestError.code === "23505";

        if (duplicateName) {
          const { data: duplicateInterest, error: duplicateInterestError } = await adminClient
            .from("research_interests")
            .select("id, name, category, parent_id")
            .ilike("name", name)
            .order("parent_id", { ascending: true, nullsFirst: true })
            .limit(1)
            .maybeSingle();

          if (!duplicateInterestError && duplicateInterest) {
            return duplicateInterest;
          }
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not create custom research interest.",
        });
      }

      return insertedInterest;
    }),

  createCustomSkill: protectedProcedure
    .input(createCustomSkillInputSchema)
    .mutation(async ({ input }) => {
      const name = normalizeCustomName(input.name);
      const adminClient = createAdminClient();

      const { data: existingSkill, error: existingSkillError } = await adminClient
        .from("skills")
        .select("id, name, category")
        .ilike("name", name)
        .order("name", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existingSkillError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not check existing skills.",
        });
      }

      if (existingSkill) {
        return existingSkill;
      }

      const { data: insertedSkill, error: insertSkillError } = await adminClient
        .from("skills")
        .insert({
          name,
          category: "Custom",
        })
        .select("id, name, category")
        .single();

      if (insertSkillError) {
        const duplicateName = insertSkillError.code === "23505";

        if (duplicateName) {
          const { data: duplicateSkill, error: duplicateSkillError } = await adminClient
            .from("skills")
            .select("id, name, category")
            .ilike("name", name)
            .order("name", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (!duplicateSkillError && duplicateSkill) {
            return duplicateSkill;
          }
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not create custom skill.",
        });
      }

      return insertedSkill;
    }),

  getResearchInterests: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("research_interests")
      .select("id, name, category, parent_id")
      .order("category", { ascending: true })
      .order("parent_id", { ascending: true, nullsFirst: true })
      .order("name", { ascending: true });

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not fetch research interests.",
      });
    }

    const grouped = getGroupedResponse(data ?? []);

    return grouped.map((group) => ({
      category: group.category,
      interests: group.items,
    }));
  }),

  getSkills: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("skills")
      .select("id, name, category")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not fetch skills.",
      });
    }

    const grouped = getGroupedResponse(data ?? []);

    return grouped.map((group) => ({
      category: group.category,
      skills: group.items,
    }));
  }),

  getMyStudentProfile: protectedProcedure.query(async ({ ctx }) => {
    const { data: profile, error: profileError } = await ctx.supabase
      .from("student_profiles")
      .select(
        "display_name, year_level, degree_type, department, availability, experience_level, preferred_collaboration_type, lab_experience, bio, linkedin_url, orcid_url, website_url, hours_per_week, start_date_availability, github_url",
      )
      .eq("user_id", ctx.user.id)
      .maybeSingle();

    if (profileError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not fetch your student profile.",
      });
    }

    if (!profile) {
      return null;
    }

    const { data: interestRows, error: interestError } = await ctx.supabase
      .from("profile_research_interests")
      .select("interest_id, is_primary, research_interests(id, name, category, parent_id)")
      .eq("user_id", ctx.user.id)
      .order("is_primary", { ascending: false });

    if (interestError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not fetch profile interests.",
      });
    }

    const { data: skillRows, error: skillError } = await ctx.supabase
      .from("profile_skills")
      .select("skill_id, proficiency_level, skills(id, name, category)")
      .eq("user_id", ctx.user.id);

    if (skillError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not fetch profile skills.",
      });
    }

    return {
      ...profile,
      interests:
        interestRows?.map((row) => ({
          interestId: row.interest_id,
          isPrimary: row.is_primary,
          interest: Array.isArray(row.research_interests)
            ? row.research_interests[0] ?? null
            : row.research_interests,
        })) ?? [],
      skills:
        skillRows?.map((row) => ({
          skillId: row.skill_id,
          proficiencyLevel: row.proficiency_level,
          skill: Array.isArray(row.skills) ? row.skills[0] ?? null : row.skills,
        })) ?? [],
    };
  }),

  getMyFacultyProfile: protectedProcedure.query(async ({ ctx }) => {
    const { data: profile, error: profileError } = await ctx.supabase
      .from("faculty_profiles")
      .select(
        "display_name, title, department, lab_name, lab_url, bio, currently_recruiting, recruiting_message, desired_experience_level, google_scholar_url, orcid_url, sought_student_levels, personal_website_url",
      )
      .eq("user_id", ctx.user.id)
      .maybeSingle();

    if (profileError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not fetch your faculty profile.",
      });
    }

    if (!profile) {
      return null;
    }

    const { data: interestRows, error: interestError } = await ctx.supabase
      .from("profile_research_interests")
      .select("interest_id, is_primary, research_interests(id, name, category, parent_id)")
      .eq("user_id", ctx.user.id)
      .order("is_primary", { ascending: false });

    if (interestError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not fetch faculty interests.",
      });
    }

    const { data: skillRows, error: skillError } = await ctx.supabase
      .from("profile_skills")
      .select("skill_id, proficiency_level, skills(id, name, category)")
      .eq("user_id", ctx.user.id);

    if (skillError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not fetch faculty desired skills.",
      });
    }

    return {
      ...profile,
      sought_student_levels:
        profile.sought_student_levels && profile.sought_student_levels.length > 0
          ? profile.sought_student_levels
          : mapSoughtExperienceToStudentLevels(profile.desired_experience_level),
      interests:
        interestRows?.map((row) => ({
          interestId: row.interest_id,
          isPrimary: row.is_primary,
          interest: Array.isArray(row.research_interests)
            ? row.research_interests[0] ?? null
            : row.research_interests,
        })) ?? [],
      skills:
        skillRows?.map((row) => ({
          skillId: row.skill_id,
          proficiencyLevel: row.proficiency_level,
          skill: Array.isArray(row.skills) ? row.skills[0] ?? null : row.skills,
        })) ?? [],
    };
  }),

  createStudentProfile: protectedProcedure
    .input(studentProfileCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const normalizedCollaborationTypes = normalizeCollaborationTypes(input.preferredCollaborationType);

      if (normalizedCollaborationTypes.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Choose at least one collaboration preference.",
        });
      }

      const { error: upsertError } = await ctx.supabase.from("student_profiles").upsert(
        {
          user_id: ctx.user.id,
          display_name: input.displayName,
          year_level: input.yearLevel,
          degree_type: input.degreeType,
          department: input.department,
          availability: input.availability,
          experience_level: input.experienceLevel,
          preferred_collaboration_type: normalizedCollaborationTypes,
          lab_experience: input.labExperience,
          bio: input.bio,
          linkedin_url: cleanOptionalUrl(input.linkedinUrl),
          orcid_url: cleanOptionalUrl(input.orcidUrl),
          website_url: cleanOptionalUrl(input.websiteUrl),
          hours_per_week: null,
          start_date_availability: null,
          github_url: null,
        },
        { onConflict: "user_id" },
      );

      if (upsertError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not save student profile.",
        });
      }

      await replaceInterestSelections(ctx.user.id, input.interests, ctx.supabase);
      await replaceSkillSelections(ctx.user.id, input.skills, ctx.supabase);

      return {
        success: true,
      };
    }),

  updateStudentProfile: protectedProcedure
    .input(studentProfileUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const normalizedCollaboration = normalizeStudentCollaborationTypes(input.preferredCollaborationType);

      if (normalizedCollaboration.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Choose at least one collaboration preference.",
        });
      }

      const { error: updateError } = await ctx.supabase.from("student_profiles").upsert(
        {
          user_id: ctx.user.id,
          display_name: input.displayName,
          year_level: input.yearLevel,
          degree_type: input.degreeType,
          department: input.department,
          availability: input.availability,
          preferred_collaboration_type: normalizedCollaboration,
          bio: input.bio,
          linkedin_url: cleanOptionalUrl(input.linkedinUrl),
          website_url: cleanOptionalUrl(input.websiteUrl),
          orcid_url: cleanOptionalText(input.orcid),
          hours_per_week: input.hoursPerWeek,
          start_date_availability: input.startDateAvailability,
          github_url: cleanOptionalUrl(input.githubUrl),
        },
        { onConflict: "user_id" },
      );

      if (updateError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not update student profile.",
        });
      }

      await replaceInterestSelections(ctx.user.id, input.interests, ctx.supabase);
      await replaceSkillSelections(ctx.user.id, input.skills, ctx.supabase);

      return {
        success: true,
      };
    }),

  createFacultyProfile: protectedProcedure
    .input(facultyProfileCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { error: upsertError } = await ctx.supabase.from("faculty_profiles").upsert(
        {
          user_id: ctx.user.id,
          display_name: input.displayName,
          title: input.title,
          department: input.department,
          lab_name: input.labName || null,
          lab_url: cleanOptionalUrl(input.labUrl),
          bio: input.bio,
          currently_recruiting: input.currentlyRecruiting,
          recruiting_message: input.currentlyRecruiting ? input.recruitingMessage : null,
          desired_experience_level: input.soughtExperienceLevel,
          sought_student_levels: mapSoughtExperienceToStudentLevels(input.soughtExperienceLevel),
          google_scholar_url: cleanOptionalUrl(input.googleScholarUrl),
          orcid_url: cleanOptionalUrl(input.orcidUrl),
          personal_website_url: null,
        },
        { onConflict: "user_id" },
      );

      if (upsertError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not save faculty profile.",
        });
      }

      await replaceInterestSelections(ctx.user.id, input.interests, ctx.supabase);
      await replaceSkillSelections(ctx.user.id, input.skills, ctx.supabase);

      return { success: true };
    }),

  updateFacultyProfile: protectedProcedure
    .input(facultyProfileUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const desiredExperienceLevel = mapStudentLevelsToSoughtExperience(input.soughtStudentLevels);

      const { error: updateError } = await ctx.supabase.from("faculty_profiles").upsert(
        {
          user_id: ctx.user.id,
          display_name: input.displayName,
          title: input.title,
          department: input.department,
          lab_name: input.labName || null,
          lab_url: cleanOptionalUrl(input.labWebsiteUrl),
          bio: input.bio,
          currently_recruiting: input.currentlyRecruiting,
          recruiting_message: input.currentlyRecruiting ? input.recruitingMessage : null,
          desired_experience_level: desiredExperienceLevel,
          sought_student_levels: input.soughtStudentLevels,
          google_scholar_url: cleanOptionalUrl(input.googleScholarUrl),
          personal_website_url: cleanOptionalUrl(input.personalWebsiteUrl),
        },
        { onConflict: "user_id" },
      );

      if (updateError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not update faculty profile.",
        });
      }

      await replaceInterestSelections(ctx.user.id, input.interests, ctx.supabase);
      await replaceSkillSelections(ctx.user.id, input.skills, ctx.supabase);

      return { success: true };
    }),

  getMySignals: protectedProcedure.query(async ({ ctx }) => {
    let role = normalizeRole(
      ctx.user.app_metadata && typeof ctx.user.app_metadata === "object" && "role" in ctx.user.app_metadata
        ? String((ctx.user.app_metadata as Record<string, unknown>).role)
        : null,
    );

    let institutionalVerified =
      ctx.user.app_metadata &&
      typeof ctx.user.app_metadata === "object" &&
      "institutional_verified" in ctx.user.app_metadata
        ? Boolean((ctx.user.app_metadata as Record<string, unknown>).institutional_verified)
        : null;

    if (!role || institutionalVerified === null) {
      const { data: profileRow, error: profileError } = await ctx.supabase
        .from("profiles")
        .select("role, institutional_verified")
        .eq("id", ctx.user.id)
        .maybeSingle();

      if (profileError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not verify your profile access.",
        });
      }

      role = role ?? normalizeRole(profileRow?.role ?? null);
      institutionalVerified = institutionalVerified ?? Boolean(profileRow?.institutional_verified);
    }

    if (role !== "student" || !institutionalVerified) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only verified students can view signals.",
      });
    }

    const adminClient = createAdminClient();
    const { data: signals, error: signalsError } = await adminClient
      .from("interest_signals")
      .select("id, faculty_id, message, status, created_at, reviewed_at")
      .eq("student_id", ctx.user.id)
      .order("created_at", { ascending: false });

    if (signalsError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not load your signals.",
      });
    }

    const facultyIds = Array.from(new Set((signals ?? []).map((signal) => signal.faculty_id).filter(Boolean)));

    let facultyById = new Map<
      string,
      {
        displayName: string;
        labName: string | null;
        department: string | null;
      }
    >();

    if (facultyIds.length > 0) {
      const { data: facultyRows, error: facultyError } = await adminClient
        .from("faculty_profiles")
        .select("user_id, display_name, lab_name, department")
        .in("user_id", facultyIds as string[]);

      if (facultyError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not load faculty data for signals.",
        });
      }

      facultyById = new Map(
        (facultyRows ?? []).map((row) => [
          row.user_id,
          {
            displayName: row.display_name,
            labName: row.lab_name,
            department: row.department,
          },
        ]),
      );
    }

    return (signals ?? []).map((signal) => {
      const faculty = signal.faculty_id ? facultyById.get(signal.faculty_id) : null;
      const fallbackLabName = faculty?.displayName ? `${faculty.displayName}'s Lab` : "Lab";

      return {
        id: signal.id,
        facultyId: signal.faculty_id ?? "",
        labName: faculty?.labName?.trim() || fallbackLabName,
        piName: faculty?.displayName ?? "Professor",
        department: faculty?.department ?? "Department not listed",
        message: signal.message ?? "",
        createdAt: signal.created_at ?? new Date().toISOString(),
        reviewedAt: signal.reviewed_at ?? null,
        status: normalizeSignalStatus(signal.status),
      };
    });
  }),

  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;
    const adminClient = createAdminClient();

    let role = normalizeRole(
      ctx.user.app_metadata && typeof ctx.user.app_metadata === "object" && "role" in ctx.user.app_metadata
        ? String((ctx.user.app_metadata as Record<string, unknown>).role)
        : null,
    );

    if (!role) {
      const { data: profileRow, error: profileError } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Something went wrong. Please try again or contact support.",
        });
      }

      role = normalizeRole(profileRow?.role ?? null);
    }

    const runStep = async (
      stepName: string,
      operation: () => Promise<{ error: { message: string } | null }>,
    ) => {
      const result = await operation();

      if (result.error) {
        throw new Error(`${stepName}: ${result.error.message}`);
      }
    };

    try {
      if (role === "faculty" || role === "researcher" || role === "coordinator") {
        await runStep("delete_faculty_signals", async () =>
          await adminClient.from("interest_signals").delete().eq("faculty_id", userId),
        );
        await runStep("delete_student_signals", async () =>
          await adminClient.from("interest_signals").delete().eq("student_id", userId),
        );
        await runStep("delete_faculty_profile", async () =>
          await adminClient.from("faculty_profiles").delete().eq("user_id", userId),
        );
        await runStep("delete_student_profile", async () =>
          await adminClient.from("student_profiles").delete().eq("user_id", userId),
        );
      } else {
        await runStep("delete_student_signals", async () =>
          await adminClient.from("interest_signals").delete().eq("student_id", userId),
        );
        await runStep("delete_faculty_signals", async () =>
          await adminClient.from("interest_signals").delete().eq("faculty_id", userId),
        );
        await runStep("delete_student_profile", async () =>
          await adminClient.from("student_profiles").delete().eq("user_id", userId),
        );
        await runStep("delete_faculty_profile", async () =>
          await adminClient.from("faculty_profiles").delete().eq("user_id", userId),
        );
      }

      await runStep("delete_profile_interests", async () =>
        await adminClient.from("profile_research_interests").delete().eq("user_id", userId),
      );
      await runStep("delete_profile_skills", async () =>
        await adminClient.from("profile_skills").delete().eq("user_id", userId),
      );
      await runStep("delete_profiles_row", async () =>
        await adminClient.from("profiles").delete().eq("id", userId),
      );

      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        throw new Error(`delete_auth_user: ${authDeleteError.message}`);
      }
    } catch (error) {
      console.error("Delete account failed", { userId, role, error });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong. Please try again or contact support.",
      });
    }

    return { success: true };
  }),

  setRecruitingStatus: protectedProcedure
    .input(recruitingStatusInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from("faculty_profiles").upsert(
        {
          user_id: ctx.user.id,
          currently_recruiting: input.recruiting,
          recruiting_message: input.recruiting ? input.message : null,
        },
        { onConflict: "user_id" },
      );

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not update recruiting status.",
        });
      }

      return { success: true };
    }),
});
