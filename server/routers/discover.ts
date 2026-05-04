import { TRPCError } from "@trpc/server";
import { Resend } from "resend";
import { z } from "zod";
import { buildInterestSignalEmail } from "@/lib/email/interest-signal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/trpc";

const experienceLevelOptions = ["any", "beginner", "intermediate", "advanced"] as const;

const searchLabsInputSchema = z.object({
  interests: z.array(z.string().trim()).optional(),
  department: z.string().trim().max(120).optional(),
  recruiting: z.boolean().optional(),
  experienceLevel: z.enum(experienceLevelOptions).optional(),
});

const labIdInputSchema = z.object({
  id: z.string().uuid("Invalid lab id."),
});

const studentIdInputSchema = z.object({
  id: z.string().uuid("Invalid student id."),
});

const facultyIdInputSchema = z.object({
  facultyId: z.string().uuid("Invalid faculty id."),
});

const createInterestSignalInputSchema = z.object({
  facultyId: z.string().uuid("Invalid faculty id."),
  message: z
    .string()
    .trim()
    .min(1, "Share why you are interested in this lab.")
    .max(300, "Message must be 300 characters or less."),
});

type TRPCSupabaseClient = Awaited<
  ReturnType<typeof import("@/lib/supabase/trpc-server").createTRPCServerClient>
>;

type FacultyRow = {
  user_id: string;
  display_name: string;
  lab_name: string | null;
  department: string | null;
  bio: string | null;
  currently_recruiting: boolean;
  desired_experience_level: (typeof experienceLevelOptions)[number];
  recruiting_message?: string | null;
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
  parent_id: number | null;
};

type SkillLinkRow = {
  user_id: string;
  skill_id: number;
  proficiency_level: "beginner" | "intermediate" | "advanced" | "expert";
};

type SkillRow = {
  id: number;
  name: string;
  category: string;
};

type StudentProfilePublicRow = {
  user_id: string;
  display_name: string;
  year_level: string | null;
  degree_type: string | null;
  department: string | null;
  availability: "actively_looking" | "open" | "not_available";
  experience_level: "beginner" | "intermediate" | "advanced";
  preferred_collaboration_type: Array<"research_assistant" | "co_author" | "project_lead">;
  lab_experience: boolean;
  bio: string | null;
  linkedin_url: string | null;
  orcid_url: string | null;
  website_url: string | null;
};

type StudentSignalSummary = {
  displayName: string;
  topInterests: string[];
  topSkills: string[];
};

function toPositiveInt(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseInterestIds(values: string[] | undefined) {
  if (!values || values.length === 0) {
    return [] as number[];
  }

  const ids = values.map(toPositiveInt).filter((value): value is number => value !== null);
  return Array.from(new Set(ids));
}

function normalizeSearchTerm(value: string | undefined) {
  if (!value) {
    return "";
  }

  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveAppUrl(requestUrl: string) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  return new URL(requestUrl).origin;
}

function resolveDisplayNameFromEmail(email: string | undefined) {
  if (!email) {
    return "Student";
  }

  const localPart = email.split("@")[0] ?? "student";
  const normalized = localPart.replace(/[._-]+/g, " ").trim();

  if (normalized.length === 0) {
    return "Student";
  }

  return normalized
    .split(" ")
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}

function normalizeSignalProfileRole(value: string | null | undefined) {
  if (value === "student") {
    return value;
  }

  return null;
}

function assertVerifiedStudent(user: { app_metadata?: unknown }) {
  if (!user.app_metadata || typeof user.app_metadata !== "object") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only verified students can express interest.",
    });
  }

  const metadata = user.app_metadata as Record<string, unknown>;
  const institutionalVerified = Boolean(metadata.institutional_verified);
  const role = typeof metadata.role === "string" ? metadata.role : "";

  if (!institutionalVerified || role !== "student") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only verified students can express interest.",
    });
  }
}

async function loadLabInterestMap(userIds: string[]) {
  const adminClient = createAdminClient();

  if (userIds.length === 0) {
    return new Map<string, Array<{ id: number; name: string; category: string; isPrimary: boolean }>>();
  }

  const { data: links, error: linksError } = await adminClient
    .from("profile_research_interests")
    .select("user_id, interest_id, is_primary")
    .in("user_id", userIds);

  if (linksError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not load lab interests.",
    });
  }

  const interestIds = Array.from(new Set((links ?? []).map((row) => row.interest_id)));

  if (interestIds.length === 0) {
    return new Map<string, Array<{ id: number; name: string; category: string; isPrimary: boolean }>>();
  }

  const { data: interests, error: interestsError } = await adminClient
    .from("research_interests")
    .select("id, name, category, parent_id")
    .in("id", interestIds);

  if (interestsError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not load research interest metadata.",
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

  map.forEach((value) => {
    value.sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) {
        return a.isPrimary ? -1 : 1;
      }

      return a.name.localeCompare(b.name);
    });
  });

  return map;
}

async function loadLabSkillMap(userIds: string[]) {
  const adminClient = createAdminClient();

  if (userIds.length === 0) {
    return new Map<
      string,
      Array<{
        id: number;
        name: string;
        category: string;
        proficiencyLevel: "beginner" | "intermediate" | "advanced" | "expert";
      }>
    >();
  }

  const { data: links, error: linksError } = await adminClient
    .from("profile_skills")
    .select("user_id, skill_id, proficiency_level")
    .in("user_id", userIds);

  if (linksError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not load lab skills.",
    });
  }

  const skillIds = Array.from(new Set((links ?? []).map((row) => row.skill_id)));

  if (skillIds.length === 0) {
    return new Map<
      string,
      Array<{
        id: number;
        name: string;
        category: string;
        proficiencyLevel: "beginner" | "intermediate" | "advanced" | "expert";
      }>
    >();
  }

  const { data: skills, error: skillsError } = await adminClient
    .from("skills")
    .select("id, name, category")
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

  const map = new Map<
    string,
    Array<{
      id: number;
      name: string;
      category: string;
      proficiencyLevel: "beginner" | "intermediate" | "advanced" | "expert";
    }>
  >();

  (links as SkillLinkRow[] | null)?.forEach((link) => {
    const skill = skillById.get(link.skill_id);

    if (!skill) {
      return;
    }

    const existing = map.get(link.user_id) ?? [];
    existing.push({
      id: skill.id,
      name: skill.name,
      category: skill.category,
      proficiencyLevel: link.proficiency_level,
    });
    map.set(link.user_id, existing);
  });

  map.forEach((value) => {
    value.sort((a, b) => a.name.localeCompare(b.name));
  });

  return map;
}

async function loadVerifiedFacultyIds(userIds: string[]) {
  const adminClient = createAdminClient();

  if (userIds.length === 0) {
    return new Set<string>();
  }

  const { data, error } = await adminClient
    .from("profiles")
    .select("id, institutional_verified")
    .in("id", userIds)
    .eq("institutional_verified", true);

  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not load faculty verification status.",
    });
  }

  return new Set((data ?? []).map((row) => row.id));
}

async function loadFacultyRows(filters: z.infer<typeof searchLabsInputSchema>) {
  const adminClient = createAdminClient();
  const term = normalizeSearchTerm(filters.department);

  let query = adminClient
    .from("faculty_profiles")
    .select("user_id, display_name, lab_name, department, bio, currently_recruiting, desired_experience_level, updated_at")
    .order("currently_recruiting", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(60);

  if (filters.recruiting !== undefined) {
    query = query.eq("currently_recruiting", filters.recruiting);
  }

  if (filters.experienceLevel) {
    query = query.eq("desired_experience_level", filters.experienceLevel);
  }

  if (term) {
    query = query.or(`lab_name.wfts.${term},bio.wfts.${term},department.wfts.${term}`);
  }

  const { data, error } = await query;

  if (error && term) {
    let fallbackQuery = adminClient
      .from("faculty_profiles")
      .select("user_id, display_name, lab_name, department, bio, currently_recruiting, desired_experience_level, updated_at")
      .order("currently_recruiting", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(60)
      .or(`lab_name.ilike.%${term}%,bio.ilike.%${term}%,department.ilike.%${term}%`);

    if (filters.recruiting !== undefined) {
      fallbackQuery = fallbackQuery.eq("currently_recruiting", filters.recruiting);
    }

    if (filters.experienceLevel) {
      fallbackQuery = fallbackQuery.eq("desired_experience_level", filters.experienceLevel);
    }

    const { data: fallbackData, error: fallbackError } = await fallbackQuery;

    if (fallbackError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not search labs.",
      });
    }

    return (fallbackData ?? []) as FacultyRow[];
  }

  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not search labs.",
    });
  }

  return (data ?? []) as FacultyRow[];
}

async function buildLabResults(rows: FacultyRow[]) {
  if (rows.length === 0) {
    return [] as Array<{
      id: string;
      piName: string;
      labName: string | null;
      department: string | null;
      bio: string | null;
      currentlyRecruiting: boolean;
      experienceLevelSought: (typeof experienceLevelOptions)[number];
      interests: Array<{ id: number; name: string; category: string; isPrimary: boolean }>;
      verified: boolean;
    }>;
  }

  const userIds = rows.map((row) => row.user_id);
  const [interestMap, verifiedIds] = await Promise.all([
    loadLabInterestMap(userIds),
    loadVerifiedFacultyIds(userIds),
  ]);

  return rows
    .filter((row) => verifiedIds.has(row.user_id))
    .map((row) => ({
      id: row.user_id,
      piName: row.display_name,
      labName: row.lab_name,
      department: row.department,
      bio: row.bio,
      currentlyRecruiting: row.currently_recruiting,
      experienceLevelSought: row.desired_experience_level,
      interests: interestMap.get(row.user_id) ?? [],
      verified: true,
    }));
}

async function getStudentSignalSummary(params: {
  supabase: TRPCSupabaseClient;
  userId: string;
  fallbackEmail: string | undefined;
}) {
  const { supabase, userId, fallbackEmail } = params;

  const { data: studentProfile, error: studentProfileError } = await supabase
    .from("student_profiles")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (studentProfileError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not load your student profile.",
    });
  }

  const { data: interestLinks, error: interestLinksError } = await supabase
    .from("profile_research_interests")
    .select("interest_id, is_primary")
    .eq("user_id", userId)
    .order("is_primary", { ascending: false });

  if (interestLinksError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not load your research interests.",
    });
  }

  const interestIds = Array.from(new Set((interestLinks ?? []).map((row) => row.interest_id)));
  let interestNames: string[] = [];

  if (interestIds.length > 0) {
    const { data: interestRows, error: interestRowsError } = await supabase
      .from("research_interests")
      .select("id, name")
      .in("id", interestIds);

    if (interestRowsError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not load interest labels.",
      });
    }

    const interestNameMap = new Map<number, string>();
    (interestRows ?? []).forEach((row) => {
      interestNameMap.set(row.id, row.name);
    });

    interestNames = (interestLinks ?? [])
      .map((row) => interestNameMap.get(row.interest_id))
      .filter((value): value is string => Boolean(value));
  }

  const { data: skillLinks, error: skillLinksError } = await supabase
    .from("profile_skills")
    .select("skill_id")
    .eq("user_id", userId);

  if (skillLinksError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not load your skills.",
    });
  }

  const skillIds = Array.from(new Set((skillLinks ?? []).map((row) => row.skill_id)));
  let skillNames: string[] = [];

  if (skillIds.length > 0) {
    const { data: skillRows, error: skillRowsError } = await supabase
      .from("skills")
      .select("id, name")
      .in("id", skillIds)
      .order("name", { ascending: true });

    if (skillRowsError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not load skill labels.",
      });
    }

    skillNames = (skillRows ?? []).map((row) => row.name);
  }

  return {
    displayName: studentProfile?.display_name ?? resolveDisplayNameFromEmail(fallbackEmail),
    topInterests: interestNames.slice(0, 3),
    topSkills: skillNames.slice(0, 3),
  } satisfies StudentSignalSummary;
}

async function sendInterestSignalEmail(params: {
  to: string;
  studentName: string;
  studentTopInterests: string[];
  message: string;
  reviewUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Email provider is not configured.",
    });
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [params.to],
    subject: `New interest signal on Researcher - ${params.studentName}`,
    html: buildInterestSignalEmail({
      studentName: params.studentName,
      studentTopInterests: params.studentTopInterests,
      studentMessage: params.message,
      reviewUrl: params.reviewUrl,
    }),
  });

  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Interest signal saved, but notification email failed.",
    });
  }
}

export const discoverRouter = createTRPCRouter({
  getResearchInterestFilters: publicProcedure.query(async () => {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("research_interests")
      .select("id, name, category, parent_id")
      .order("category", { ascending: true })
      .order("parent_id", { ascending: true, nullsFirst: true })
      .order("name", { ascending: true });

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not load discovery filters.",
      });
    }

    const grouped = new Map<string, InterestRow[]>();

    (data as InterestRow[] | null)?.forEach((interest) => {
      const existing = grouped.get(interest.category) ?? [];
      existing.push(interest);
      grouped.set(interest.category, existing);
    });

    return Array.from(grouped.entries()).map(([category, interests]) => ({
      category,
      interests,
    }));
  }),

  searchLabs: publicProcedure.input(searchLabsInputSchema).query(async ({ input }) => {
    const facultyRows = await loadFacultyRows(input);
    const interestIds = parseInterestIds(input.interests);

    let filteredRows = facultyRows;

    if (interestIds.length > 0) {
      const adminClient = createAdminClient();
      const { data: matchingInterestRows, error: matchingInterestError } = await adminClient
        .from("profile_research_interests")
        .select("user_id, interest_id")
        .in("interest_id", interestIds);

      if (matchingInterestError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not filter labs by research interests.",
        });
      }

      const matchingUserIds = new Set((matchingInterestRows ?? []).map((row) => row.user_id));
      filteredRows = facultyRows.filter((row) => matchingUserIds.has(row.user_id));
    }

    const labs = await buildLabResults(filteredRows);

    return {
      total: labs.length,
      labs,
    };
  }),

  getFeaturedLabs: publicProcedure.query(async () => {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("faculty_profiles")
      .select("user_id, display_name, lab_name, department, bio, currently_recruiting, desired_experience_level")
      .order("currently_recruiting", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(6);

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not load featured labs.",
      });
    }

    const labs = await buildLabResults((data ?? []) as FacultyRow[]);

    return {
      total: labs.length,
      labs,
    };
  }),

  getStudentProfile: publicProcedure.input(studentIdInputSchema).query(async ({ input }) => {
    const adminClient = createAdminClient();

    const { data: verificationProfile, error: verificationError } = await adminClient
      .from("profiles")
      .select("id, institutional_verified, role")
      .eq("id", input.id)
      .maybeSingle();

    if (verificationError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not verify student profile access.",
      });
    }

    if (
      !verificationProfile ||
      !verificationProfile.institutional_verified ||
      normalizeSignalProfileRole(verificationProfile.role) !== "student"
    ) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Student profile not found.",
      });
    }

    const { data: studentProfile, error: studentProfileError } = await adminClient
      .from("student_profiles")
      .select(
        "user_id, display_name, year_level, degree_type, department, availability, experience_level, preferred_collaboration_type, lab_experience, bio, linkedin_url, orcid_url, website_url",
      )
      .eq("user_id", input.id)
      .maybeSingle();

    if (studentProfileError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not load student profile.",
      });
    }

    if (!studentProfile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Student profile not found.",
      });
    }

    const { data: interestLinks, error: interestLinksError } = await adminClient
      .from("profile_research_interests")
      .select("interest_id, is_primary")
      .eq("user_id", input.id)
      .order("is_primary", { ascending: false });

    if (interestLinksError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not load student interests.",
      });
    }

    const interestIds = Array.from(new Set((interestLinks ?? []).map((row) => row.interest_id)));

    let interests: Array<{ id: number; name: string; category: string; isPrimary: boolean }> = [];
    if (interestIds.length > 0) {
      const { data: interestRows, error: interestRowsError } = await adminClient
        .from("research_interests")
        .select("id, name, category")
        .in("id", interestIds);

      if (interestRowsError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not load student interest labels.",
        });
      }

      const interestById = new Map<number, { id: number; name: string; category: string }>();
      (interestRows ?? []).forEach((row) => {
        interestById.set(row.id, row);
      });

      interests = (interestLinks ?? []).flatMap((link) => {
        const interest = interestById.get(link.interest_id);

        if (!interest) {
          return [];
        }

        return [
          {
            id: interest.id,
            name: interest.name,
            category: interest.category,
            isPrimary: link.is_primary,
          },
        ];
      });
    }

    const { data: skillLinks, error: skillLinksError } = await adminClient
      .from("profile_skills")
      .select("skill_id, proficiency_level")
      .eq("user_id", input.id);

    if (skillLinksError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not load student skills.",
      });
    }

    const skillIds = Array.from(new Set((skillLinks ?? []).map((row) => row.skill_id)));
    let skills: Array<{ id: number; name: string; category: string; proficiencyLevel: string }> = [];
    if (skillIds.length > 0) {
      const { data: skillRows, error: skillRowsError } = await adminClient
        .from("skills")
        .select("id, name, category")
        .in("id", skillIds);

      if (skillRowsError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not load student skill labels.",
        });
      }

      const skillById = new Map<number, { id: number; name: string; category: string }>();
      (skillRows ?? []).forEach((row) => {
        skillById.set(row.id, row);
      });

      skills = (skillLinks ?? [])
        .flatMap((link) => {
          const skill = skillById.get(link.skill_id);

          if (!skill) {
            return [];
          }

          return [
            {
              id: skill.id,
              name: skill.name,
              category: skill.category,
              proficiencyLevel: link.proficiency_level,
            },
          ];
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    const profile = studentProfile as StudentProfilePublicRow;

    return {
      id: profile.user_id,
      displayName: profile.display_name,
      yearLevel: profile.year_level,
      degreeType: profile.degree_type,
      department: profile.department,
      availability: profile.availability,
      experienceLevel: profile.experience_level,
      preferredCollaborationType: profile.preferred_collaboration_type,
      labExperience: profile.lab_experience,
      bio: profile.bio,
      linkedinUrl: profile.linkedin_url,
      orcidUrl: profile.orcid_url,
      websiteUrl: profile.website_url,
      interests,
      skills,
    };
  }),

  getLabProfile: publicProcedure.input(labIdInputSchema).query(async ({ input }) => {
    const adminClient = createAdminClient();

    const { data: facultyProfile, error: facultyProfileError } = await adminClient
      .from("faculty_profiles")
      .select(
        "user_id, display_name, department, lab_name, lab_url, bio, currently_recruiting, recruiting_message, desired_experience_level",
      )
      .eq("user_id", input.id)
      .maybeSingle();

    if (facultyProfileError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not load the lab profile.",
      });
    }

    if (!facultyProfile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Lab not found.",
      });
    }

    const [interestMap, skillMap, verifiedIds] = await Promise.all([
      loadLabInterestMap([input.id]),
      loadLabSkillMap([input.id]),
      loadVerifiedFacultyIds([input.id]),
    ]);

    return {
      id: facultyProfile.user_id,
      piName: facultyProfile.display_name,
      department: facultyProfile.department,
      labName: facultyProfile.lab_name,
      labUrl: facultyProfile.lab_url,
      bio: facultyProfile.bio,
      currentlyRecruiting: facultyProfile.currently_recruiting,
      recruitingMessage: facultyProfile.recruiting_message,
      experienceLevelSought: facultyProfile.desired_experience_level,
      interests: interestMap.get(input.id) ?? [],
      desiredSkills: skillMap.get(input.id) ?? [],
      verified: verifiedIds.has(input.id),
    };
  }),

  hasExpressedInterest: protectedProcedure
    .input(facultyIdInputSchema)
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("interest_signals")
        .select("id")
        .eq("student_id", ctx.user.id)
        .eq("faculty_id", input.facultyId)
        .maybeSingle();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not determine your interest status.",
        });
      }

      return Boolean(data);
    }),

  getMySignalSummary: protectedProcedure.query(async ({ ctx }) => {
    return getStudentSignalSummary({
      supabase: ctx.supabase,
      userId: ctx.user.id,
      fallbackEmail: ctx.user.email,
    });
  }),

  createInterestSignal: protectedProcedure
    .input(createInterestSignalInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertVerifiedStudent(ctx.user);

      if (ctx.user.id === input.facultyId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot express interest in your own lab.",
        });
      }

      const adminClient = createAdminClient();

      const { data: facultyProfile, error: facultyProfileError } = await adminClient
        .from("faculty_profiles")
        .select("user_id, display_name")
        .eq("user_id", input.facultyId)
        .maybeSingle();

      if (facultyProfileError || !facultyProfile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Faculty profile not found.",
        });
      }

      const { error: insertError } = await ctx.supabase.from("interest_signals").insert({
        student_id: ctx.user.id,
        faculty_id: input.facultyId,
        message: input.message,
      });

      if (insertError) {
        const duplicateSignal =
          insertError.code === "23505" ||
          insertError.message.toLowerCase().includes("duplicate") ||
          insertError.message.toLowerCase().includes("unique");

        if (duplicateSignal) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "You already expressed interest in this lab.",
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not submit your interest signal.",
        });
      }

      const studentSummary = await getStudentSignalSummary({
        supabase: ctx.supabase,
        userId: ctx.user.id,
        fallbackEmail: ctx.user.email,
      });

      const { data: facultyAuthUser, error: facultyAuthUserError } = await adminClient.auth.admin.getUserById(
        input.facultyId,
      );

      if (facultyAuthUserError || !facultyAuthUser.user?.email) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Interest signal saved, but professor email could not be resolved.",
        });
      }

      const appUrl = resolveAppUrl(ctx.req.url);
      const reviewUrl = `${appUrl}/dashboard/faculty`;

      await sendInterestSignalEmail({
        to: facultyAuthUser.user.email,
        studentName: studentSummary.displayName,
        studentTopInterests: studentSummary.topInterests,
        message: input.message,
        reviewUrl,
      });

      return {
        success: true,
        facultyName: facultyProfile.display_name,
      };
    }),
});
