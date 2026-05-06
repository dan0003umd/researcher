import { z } from "zod";

export const yearLevelOptions = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "Masters",
  "PhD",
  "Postdoc",
] as const;

export const degreeTypeOptions = ["BS", "MS", "PhD", "Other"] as const;

export const availabilityOptions = ["actively_looking", "open", "not_available"] as const;

export const experienceLevelOptions = ["beginner", "intermediate", "advanced"] as const;

export const studentEditYearLevelOptions = ["1st", "2nd", "3rd", "4th", "5th+"] as const;

export const studentEditDegreeTypeOptions = ["BS", "MS", "PhD", "Postdoc", "Other"] as const;

export const studentHoursPerWeekOptions = ["5-10", "10-20", "20+"] as const;

export const studentStartDateAvailabilityOptions = ["immediately", "next_semester", "flexible"] as const;

export const collaborationTypeOptions = [
  "research_assistant",
  "co_author",
  "project_lead",
  "flexible",
] as const;

export const storedCollaborationTypeOptions = [
  "research_assistant",
  "co_author",
  "project_lead",
  "independent_project",
  "thesis_collaboration",
  "casual_mentorship",
] as const;

const legacyFlexibleCollaborationValues = [
  "research_assistant",
  "co_author",
  "project_lead",
] as const;

export const studentEditCollaborationTypeOptions = [
  "research_assistant",
  "co_author",
  "independent_project",
  "thesis_collaboration",
  "casual_mentorship",
  "project_lead",
] as const;

export const skillProficiencyOptions = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
] as const;

export const facultyTitleOptions = [
  "Professor",
  "Associate Professor",
  "Assistant Professor",
  "Postdoc",
  "Research Scientist",
  "Lecturer",
] as const;

export const soughtExperienceOptions = ["any", "beginner", "intermediate", "advanced"] as const;

export const facultySoughtStudentLevelOptions = ["undergrad", "ms", "phd"] as const;

const optionalUrlSchema = z.union([z.literal(""), z.string().trim().url("Enter a valid URL.")]);
const optionalTextSchema = z.union([z.literal(""), z.string().trim().max(120)]);

export const basicInfoSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required.").max(80, "Keep display name under 80 characters."),
  yearLevel: z.enum(yearLevelOptions, { message: "Select your year level." }),
  degreeType: z.enum(degreeTypeOptions, { message: "Select your degree type." }),
  department: z.string().trim().min(1, "Department is required.").max(120, "Keep department under 120 characters."),
});

export const interestSelectionSchema = z
  .array(
    z.object({
      interestId: z.number().int().positive(),
      isPrimary: z.boolean(),
    }),
  )
  .min(1, "Choose at least 1 research interest.")
  .max(8, "Choose up to 8 research interests.")
  .refine((items) => items.filter((item) => item.isPrimary).length <= 3, {
    message: "Mark up to 3 primary interests.",
  });

export const skillSelectionSchema = z
  .array(
    z.object({
      skillId: z.number().int().positive(),
      proficiencyLevel: z.enum(skillProficiencyOptions),
    }),
  )
  .min(1, "Choose at least 1 skill.")
  .max(10, "Choose up to 10 skills.");

export const collaborationPreferencesSchema = z.object({
  availability: z.enum(availabilityOptions, { message: "Select your availability." }),
  experienceLevel: z.enum(experienceLevelOptions, { message: "Select your experience level." }),
  preferredCollaborationType: z
    .array(z.enum(collaborationTypeOptions))
    .min(1, "Select at least one collaboration preference."),
  labExperience: z.boolean(),
});

export const aboutYouSchema = z.object({
  bio: z.string().trim().min(1, "Bio is required.").max(500, "Bio must be 500 characters or less."),
  linkedinUrl: optionalUrlSchema,
  orcidUrl: optionalUrlSchema,
  websiteUrl: optionalUrlSchema,
});

export const facultyAcademicInfoSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required.").max(120),
  title: z.enum(facultyTitleOptions, { message: "Select a title." }),
  department: z.string().trim().min(1, "Department is required.").max(120),
  labName: z.string().trim().max(160).optional().or(z.literal("")),
  labUrl: optionalUrlSchema,
});

const facultyRecruitingBaseSchema = z.object({
  currentlyRecruiting: z.boolean(),
  recruitingMessage: z.string().trim().max(300, "Recruiting message must be 300 characters or less."),
  skills: skillSelectionSchema,
  soughtExperienceLevel: z.enum(soughtExperienceOptions),
});

export const facultyRecruitingSchema = facultyRecruitingBaseSchema
  .superRefine((value, context) => {
    if (value.currentlyRecruiting && value.recruitingMessage.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recruitingMessage"],
        message: "Add a recruiting message when actively recruiting.",
      });
    }
  });

export const facultyBioLinksSchema = z.object({
  bio: z.string().trim().min(1, "Bio is required.").max(500, "Bio must be 500 characters or less."),
  googleScholarUrl: optionalUrlSchema,
  orcidUrl: optionalUrlSchema,
  labWebsiteUrl: optionalUrlSchema,
});

export const facultyProfileFormSchema = facultyAcademicInfoSchema
  .extend({
    interests: interestSelectionSchema,
  })
  .extend(facultyRecruitingBaseSchema.shape)
  .merge(facultyBioLinksSchema)
  .superRefine((value, context) => {
    if (value.currentlyRecruiting && value.recruitingMessage.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recruitingMessage"],
        message: "Add a recruiting message when actively recruiting.",
      });
    }
  });

export const studentProfileFormSchema = basicInfoSchema
  .extend({
    interests: interestSelectionSchema,
    skills: skillSelectionSchema,
  })
  .merge(collaborationPreferencesSchema)
  .merge(aboutYouSchema);

export const studentProfileEditSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required.").max(80, "Keep display name under 80 characters."),
  degreeType: z.enum(studentEditDegreeTypeOptions, { message: "Select your degree type." }),
  yearLevel: z.enum(studentEditYearLevelOptions, { message: "Select your year level." }),
  department: z.string().trim().min(1, "Department is required.").max(120, "Keep department under 120 characters."),
  bio: z.string().trim().min(1, "Bio is required.").max(500, "Bio must be 500 characters or less."),
  interests: interestSelectionSchema,
  skills: skillSelectionSchema,
  availability: z.enum(availabilityOptions, { message: "Select your availability." }),
  preferredCollaborationType: z
    .array(z.enum(studentEditCollaborationTypeOptions))
    .min(1, "Select at least one collaboration preference."),
  hoursPerWeek: z.enum(studentHoursPerWeekOptions, { message: "Select hours per week." }),
  startDateAvailability: z.enum(studentStartDateAvailabilityOptions, {
    message: "Select your start availability.",
  }),
  linkedinUrl: optionalUrlSchema,
  websiteUrl: optionalUrlSchema,
  orcid: optionalTextSchema,
  githubUrl: optionalUrlSchema,
});

const facultyProfileEditSchemaBase = z.object({
  displayName: z.string().trim().min(1, "Display name is required.").max(120),
  title: z.enum(facultyTitleOptions, { message: "Select a title." }),
  department: z.string().trim().min(1, "Department is required.").max(120),
  labName: z.string().trim().max(160).optional().or(z.literal("")),
  bio: z.string().trim().min(1, "Bio is required.").max(500, "Bio must be 500 characters or less."),
  interests: interestSelectionSchema,
  currentlyRecruiting: z.boolean(),
  soughtStudentLevels: z
    .array(z.enum(facultySoughtStudentLevelOptions))
    .min(1, "Select at least one student level."),
  skills: skillSelectionSchema,
  recruitingMessage: z.string().trim().max(300, "Recruiting message must be 300 characters or less."),
  labWebsiteUrl: optionalUrlSchema,
  googleScholarUrl: optionalUrlSchema,
  personalWebsiteUrl: optionalUrlSchema,
});

export const facultyProfileEditSchema = facultyProfileEditSchemaBase.superRefine((value, context) => {
  if (value.currentlyRecruiting && value.recruitingMessage.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recruitingMessage"],
      message: "Add a recruiting message when actively recruiting.",
    });
  }
});

export type StudentProfileFormValues = z.infer<typeof studentProfileFormSchema>;
export type FacultyProfileFormValues = z.infer<typeof facultyProfileFormSchema>;
export type StoredCollaborationType = (typeof storedCollaborationTypeOptions)[number];
export type CollaborationTypeValue = (typeof collaborationTypeOptions)[number];
export type SkillProficiencyValue = (typeof skillProficiencyOptions)[number];
export type StudentProfileEditValues = z.infer<typeof studentProfileEditSchema>;
export type FacultyProfileEditValues = z.infer<typeof facultyProfileEditSchema>;

export function normalizeCollaborationTypes(values: CollaborationTypeValue[]) {
  if (values.includes("flexible")) {
    return [...legacyFlexibleCollaborationValues] as StoredCollaborationType[];
  }

  return values
    .filter((value): value is Exclude<CollaborationTypeValue, "flexible"> => value !== "flexible")
    .map((value) => value as StoredCollaborationType);
}
