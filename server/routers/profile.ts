import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  availabilityOptions,
  basicInfoSchema,
  collaborationPreferencesSchema,
  facultyAcademicInfoSchema,
  facultyBioLinksSchema,
  facultyProfileFormSchema,
  facultyRecruitingSchema,
  normalizeCollaborationTypes,
  skillSelectionSchema,
  skillProficiencyOptions,
  studentProfileFormSchema,
  storedCollaborationTypeOptions,
  aboutYouSchema,
  interestSelectionSchema,
  experienceLevelOptions,
} from "@/lib/validators/profile";
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

const studentProfileUpdateInputSchema = z
  .object({
    displayName: basicInfoSchema.shape.displayName.optional(),
    yearLevel: basicInfoSchema.shape.yearLevel.optional(),
    degreeType: basicInfoSchema.shape.degreeType.optional(),
    department: basicInfoSchema.shape.department.optional(),
    interests: interestSelectionSchema.optional(),
    skills: skillSelectionSchema.optional(),
    availability: z.enum(availabilityOptions).optional(),
    experienceLevel: z.enum(experienceLevelOptions).optional(),
    preferredCollaborationType: collaborationPreferencesSchema.shape.preferredCollaborationType.optional(),
    labExperience: z.boolean().optional(),
    bio: aboutYouSchema.shape.bio.optional(),
    linkedinUrl: aboutYouSchema.shape.linkedinUrl.optional(),
    orcidUrl: aboutYouSchema.shape.orcidUrl.optional(),
    websiteUrl: aboutYouSchema.shape.websiteUrl.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

const facultyProfileUpdateInputSchema = z
  .object({
    displayName: facultyAcademicInfoSchema.shape.displayName.optional(),
    title: facultyAcademicInfoSchema.shape.title.optional(),
    department: facultyAcademicInfoSchema.shape.department.optional(),
    labName: facultyAcademicInfoSchema.shape.labName.optional(),
    labUrl: facultyAcademicInfoSchema.shape.labUrl.optional(),
    interests: interestSelectionSchema.optional(),
    currentlyRecruiting: facultyRecruitingSchema.shape.currentlyRecruiting.optional(),
    recruitingMessage: facultyRecruitingSchema.shape.recruitingMessage.optional(),
    skills: skillSelectionSchema.optional(),
    soughtExperienceLevel: facultyRecruitingSchema.shape.soughtExperienceLevel.optional(),
    bio: facultyBioLinksSchema.shape.bio.optional(),
    googleScholarUrl: facultyBioLinksSchema.shape.googleScholarUrl.optional(),
    orcidUrl: facultyBioLinksSchema.shape.orcidUrl.optional(),
    labWebsiteUrl: facultyBioLinksSchema.shape.labWebsiteUrl.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
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
        "display_name, year_level, degree_type, department, availability, experience_level, preferred_collaboration_type, lab_experience, bio, linkedin_url, orcid_url, website_url",
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
        "display_name, title, department, lab_name, lab_url, bio, currently_recruiting, recruiting_message, desired_experience_level, google_scholar_url, orcid_url",
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
      const profileUpdates: {
        display_name?: string;
        year_level?: string;
        degree_type?: string;
        department?: string;
        availability?: (typeof availabilityOptions)[number];
        experience_level?: (typeof experienceLevelOptions)[number];
        preferred_collaboration_type?: (typeof storedCollaborationTypeOptions)[number][];
        lab_experience?: boolean;
        bio?: string;
        linkedin_url?: string | null;
        orcid_url?: string | null;
        website_url?: string | null;
      } = {};

      if (input.displayName !== undefined) profileUpdates.display_name = input.displayName;
      if (input.yearLevel !== undefined) profileUpdates.year_level = input.yearLevel;
      if (input.degreeType !== undefined) profileUpdates.degree_type = input.degreeType;
      if (input.department !== undefined) profileUpdates.department = input.department;
      if (input.availability !== undefined) profileUpdates.availability = input.availability;
      if (input.experienceLevel !== undefined) profileUpdates.experience_level = input.experienceLevel;
      if (input.labExperience !== undefined) profileUpdates.lab_experience = input.labExperience;
      if (input.bio !== undefined) profileUpdates.bio = input.bio;
      if (input.linkedinUrl !== undefined) profileUpdates.linkedin_url = cleanOptionalUrl(input.linkedinUrl);
      if (input.orcidUrl !== undefined) profileUpdates.orcid_url = cleanOptionalUrl(input.orcidUrl);
      if (input.websiteUrl !== undefined) profileUpdates.website_url = cleanOptionalUrl(input.websiteUrl);

      if (input.preferredCollaborationType !== undefined) {
        const normalized = normalizeCollaborationTypes(input.preferredCollaborationType);

        if (normalized.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Choose at least one collaboration preference.",
          });
        }

        profileUpdates.preferred_collaboration_type = normalized;
      }

      if (Object.keys(profileUpdates).length > 0) {
        const { error: updateError } = await ctx.supabase
          .from("student_profiles")
          .upsert({ user_id: ctx.user.id, ...profileUpdates }, { onConflict: "user_id" });

        if (updateError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not update student profile.",
          });
        }
      }

      if (input.interests !== undefined) {
        await replaceInterestSelections(ctx.user.id, input.interests, ctx.supabase);
      }

      if (input.skills !== undefined) {
        await replaceSkillSelections(ctx.user.id, input.skills, ctx.supabase);
      }

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
          google_scholar_url: cleanOptionalUrl(input.googleScholarUrl),
          orcid_url: cleanOptionalUrl(input.orcidUrl),
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
      const profileUpdates: {
        display_name?: string;
        title?: string;
        department?: string;
        lab_name?: string | null;
        lab_url?: string | null;
        bio?: string;
        currently_recruiting?: boolean;
        recruiting_message?: string | null;
        desired_experience_level?: "any" | "beginner" | "intermediate" | "advanced";
        google_scholar_url?: string | null;
        orcid_url?: string | null;
      } = {};

      if (input.displayName !== undefined) profileUpdates.display_name = input.displayName;
      if (input.title !== undefined) profileUpdates.title = input.title;
      if (input.department !== undefined) profileUpdates.department = input.department;
      if (input.labName !== undefined) profileUpdates.lab_name = input.labName || null;
      if (input.labUrl !== undefined) profileUpdates.lab_url = cleanOptionalUrl(input.labUrl);
      if (input.bio !== undefined) profileUpdates.bio = input.bio;
      if (input.currentlyRecruiting !== undefined) profileUpdates.currently_recruiting = input.currentlyRecruiting;
      if (input.recruitingMessage !== undefined) {
        profileUpdates.recruiting_message = cleanOptionalUrl(input.recruitingMessage) ?? null;
      }
      if (input.soughtExperienceLevel !== undefined) {
        profileUpdates.desired_experience_level = input.soughtExperienceLevel;
      }
      if (input.googleScholarUrl !== undefined) {
        profileUpdates.google_scholar_url = cleanOptionalUrl(input.googleScholarUrl);
      }
      if (input.orcidUrl !== undefined) profileUpdates.orcid_url = cleanOptionalUrl(input.orcidUrl);
      if (input.labWebsiteUrl !== undefined) profileUpdates.lab_url = cleanOptionalUrl(input.labWebsiteUrl);

      if (Object.keys(profileUpdates).length > 0) {
        const { error: updateError } = await ctx.supabase
          .from("faculty_profiles")
          .upsert({ user_id: ctx.user.id, ...profileUpdates }, { onConflict: "user_id" });

        if (updateError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not update faculty profile.",
          });
        }
      }

      if (input.interests !== undefined) {
        await replaceInterestSelections(ctx.user.id, input.interests, ctx.supabase);
      }

      if (input.skills !== undefined) {
        await replaceSkillSelections(ctx.user.id, input.skills, ctx.supabase);
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
