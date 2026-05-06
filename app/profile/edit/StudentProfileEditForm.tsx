"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { ResearchInterestSelector, type InterestGroup } from "@/app/onboarding/shared/ResearchInterestSelector";
import { SkillSelector, type SkillGroup } from "@/app/onboarding/shared/SkillSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpcClient } from "@/lib/trpc/client";
import {
  availabilityOptions,
  studentEditDegreeTypeOptions,
  studentEditYearLevelOptions,
  studentHoursPerWeekOptions,
  studentProfileEditSchema,
  studentStartDateAvailabilityOptions,
  type SkillProficiencyValue,
  type StudentProfileEditValues,
} from "@/lib/validators/profile";

type StudentProfileData = {
  display_name: string;
  year_level: string | null;
  degree_type: string | null;
  department: string | null;
  availability: (typeof availabilityOptions)[number];
  preferred_collaboration_type: string[];
  bio: string | null;
  linkedin_url: string | null;
  orcid_url: string | null;
  website_url: string | null;
  hours_per_week: string | null;
  start_date_availability: string | null;
  github_url: string | null;
  interests: Array<{
    interestId: number;
    isPrimary: boolean;
  }>;
  skills: Array<{
    skillId: number;
    proficiencyLevel: SkillProficiencyValue;
  }>;
} | null;

type StudentProfileEditFormProps = {
  initialProfile: StudentProfileData;
  interestGroups: InterestGroup[];
  skillGroups: SkillGroup[];
};

const collaborationOptions = [
  "research_assistant",
  "co_author",
  "independent_project",
  "thesis_collaboration",
  "casual_mentorship",
] as const;

const collaborationLabelMap: Record<(typeof collaborationOptions)[number], string> = {
  research_assistant: "Research Assistant",
  co_author: "Co-author",
  independent_project: "Independent Project",
  thesis_collaboration: "Thesis Collaboration",
  casual_mentorship: "Casual Mentorship",
};

const availabilityLabelMap: Record<(typeof availabilityOptions)[number], string> = {
  actively_looking: "Actively Looking",
  open: "Open to It",
  not_available: "Not Available Right Now",
};

const startDateLabelMap: Record<(typeof studentStartDateAvailabilityOptions)[number], string> = {
  immediately: "Immediately",
  next_semester: "Next Semester",
  flexible: "Flexible",
};

function normalizeYearLevel(value: string | null | undefined): StudentProfileEditValues["yearLevel"] {
  if (!value) {
    return "1st";
  }

  if (
    value === "1st" ||
    value === "2nd" ||
    value === "3rd" ||
    value === "4th" ||
    value === "5th+"
  ) {
    return value;
  }

  const legacyMap: Record<string, StudentProfileEditValues["yearLevel"]> = {
    freshman: "1st",
    sophomore: "2nd",
    junior: "3rd",
    senior: "4th",
    masters: "5th+",
    phd: "5th+",
    postdoc: "5th+",
  };

  return legacyMap[value.toLowerCase()] ?? "5th+";
}

function normalizeDegreeType(value: string | null | undefined): StudentProfileEditValues["degreeType"] {
  if (
    value === "BS" ||
    value === "MS" ||
    value === "PhD" ||
    value === "Postdoc" ||
    value === "Other"
  ) {
    return value;
  }

  return "Other";
}

function normalizeCollaboration(values: string[] | null | undefined) {
  if (!values || values.length === 0) {
    return ["research_assistant"] as StudentProfileEditValues["preferredCollaborationType"];
  }

  const normalized = values
    .map((value) => (value === "project_lead" ? "independent_project" : value))
    .filter((value): value is StudentProfileEditValues["preferredCollaborationType"][number] =>
      collaborationOptions.includes(value as (typeof collaborationOptions)[number]),
    );

  return normalized.length > 0
    ? Array.from(new Set(normalized))
    : (["research_assistant"] as StudentProfileEditValues["preferredCollaborationType"]);
}

function buildInitialValues(profile: StudentProfileData): StudentProfileEditValues {
  if (!profile) {
    return {
      displayName: "",
      degreeType: "BS",
      yearLevel: "1st",
      department: "",
      bio: "",
      interests: [],
      skills: [],
      availability: "open",
      preferredCollaborationType: ["research_assistant"],
      hoursPerWeek: "5-10",
      startDateAvailability: "flexible",
      linkedinUrl: "",
      websiteUrl: "",
      orcid: "",
      githubUrl: "",
    };
  }

  return {
    displayName: profile.display_name ?? "",
    degreeType: normalizeDegreeType(profile.degree_type),
    yearLevel: normalizeYearLevel(profile.year_level),
    department: profile.department ?? "",
    bio: profile.bio ?? "",
    interests: profile.interests,
    skills: profile.skills,
    availability: profile.availability ?? "open",
    preferredCollaborationType: normalizeCollaboration(profile.preferred_collaboration_type),
    hoursPerWeek:
      profile.hours_per_week && studentHoursPerWeekOptions.includes(profile.hours_per_week as "5-10")
        ? (profile.hours_per_week as StudentProfileEditValues["hoursPerWeek"])
        : "5-10",
    startDateAvailability:
      profile.start_date_availability &&
      studentStartDateAvailabilityOptions.includes(profile.start_date_availability as "immediately")
        ? (profile.start_date_availability as StudentProfileEditValues["startDateAvailability"])
        : "flexible",
    linkedinUrl: profile.linkedin_url ?? "",
    websiteUrl: profile.website_url ?? "",
    orcid: profile.orcid_url ?? "",
    githubUrl: profile.github_url ?? "",
  };
}

function mapValidationIssues(error: z.ZodError) {
  const nextErrors: Record<string, string> = {};

  error.issues.forEach((issue) => {
    const key = issue.path[0]?.toString() ?? "form";
    if (!nextErrors[key]) {
      nextErrors[key] = issue.message;
    }
  });

  return nextErrors;
}

export function StudentProfileEditForm({
  initialProfile,
  interestGroups,
  skillGroups,
}: StudentProfileEditFormProps) {
  const router = useRouter();
  const [formValues, setFormValues] = useState<StudentProfileEditValues>(() => buildInitialValues(initialProfile));
  const [interestQuery, setInterestQuery] = useState("");
  const [skillQuery, setSkillQuery] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const filteredInterestGroups = useMemo(() => {
    const query = interestQuery.trim().toLowerCase();

    if (!query) {
      return interestGroups;
    }

    return interestGroups
      .map((group) => ({
        ...group,
        interests: group.interests.filter((interest) => interest.name.toLowerCase().includes(query)),
      }))
      .filter((group) => group.interests.length > 0);
  }, [interestGroups, interestQuery]);

  const filteredSkillGroups = useMemo(() => {
    const query = skillQuery.trim().toLowerCase();

    if (!query) {
      return skillGroups;
    }

    return skillGroups
      .map((group) => ({
        ...group,
        skills: group.skills.filter((skill) => skill.name.toLowerCase().includes(query)),
      }))
      .filter((group) => group.skills.length > 0);
  }, [skillGroups, skillQuery]);

  const toggleInterest = (interestId: number) => {
    setFormValues((previous) => {
      const exists = previous.interests.some((interest) => interest.interestId === interestId);

      if (exists) {
        return {
          ...previous,
          interests: previous.interests.filter((interest) => interest.interestId !== interestId),
        };
      }

      if (previous.interests.length >= 8) {
        return previous;
      }

      return {
        ...previous,
        interests: [...previous.interests, { interestId, isPrimary: false }],
      };
    });
  };

  const togglePrimaryInterest = (interestId: number) => {
    setFormValues((previous) => {
      const primaryCount = previous.interests.filter((interest) => interest.isPrimary).length;

      return {
        ...previous,
        interests: previous.interests.map((interest) => {
          if (interest.interestId !== interestId) {
            return interest;
          }

          if (!interest.isPrimary && primaryCount >= 3) {
            return interest;
          }

          return {
            ...interest,
            isPrimary: !interest.isPrimary,
          };
        }),
      };
    });
  };

  const toggleSkill = (skillId: number) => {
    setFormValues((previous) => {
      const exists = previous.skills.some((skill) => skill.skillId === skillId);

      if (exists) {
        return {
          ...previous,
          skills: previous.skills.filter((skill) => skill.skillId !== skillId),
        };
      }

      if (previous.skills.length >= 10) {
        return previous;
      }

      return {
        ...previous,
        skills: [...previous.skills, { skillId, proficiencyLevel: "beginner" }],
      };
    });
  };

  const setSkillProficiency = (skillId: number, proficiencyLevel: SkillProficiencyValue) => {
    setFormValues((previous) => ({
      ...previous,
      skills: previous.skills.map((skill) =>
        skill.skillId === skillId
          ? {
              ...skill,
              proficiencyLevel,
            }
          : skill,
      ),
    }));
  };

  const toggleCollaborationType = (value: (typeof collaborationOptions)[number]) => {
    setFormValues((previous) => {
      const exists = previous.preferredCollaborationType.includes(value);
      const nextValues = exists
        ? previous.preferredCollaborationType.filter((item) => item !== value)
        : [...previous.preferredCollaborationType, value];

      return {
        ...previous,
        preferredCollaborationType: nextValues,
      };
    });
  };

  const handleSave = async () => {
    setErrors({});
    setGlobalError(null);

    const parsed = studentProfileEditSchema.safeParse(formValues);

    if (!parsed.success) {
      setErrors(mapValidationIssues(parsed.error));
      setGlobalError("Please review the highlighted fields.");
      return;
    }

    setIsSaving(true);

    try {
      await trpcClient.profile.updateStudentProfile.mutate(parsed.data);
      setShowSuccessToast(true);
      window.setTimeout(() => setShowSuccessToast(false), 2500);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update your profile.";
      setGlobalError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-4xl space-y-6 pb-24 md:pb-6">
      {showSuccessToast ? (
        <div className="fixed right-4 top-20 z-50 rounded-md border border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-900 shadow-sm">
          Profile updated successfully
        </div>
      ) : null}

      <header className="space-y-2">
        <Link href="/dashboard" className="text-sm text-primary underline-offset-4 hover:underline">
          {"\u2190"} Dashboard
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Edit Profile</h1>
        <p className="text-sm text-muted-foreground">Changes save immediately when you click Save.</p>
      </header>

      {globalError ? <p className="text-sm text-destructive">{globalError}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Basic Info</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="display-name" className="text-sm font-medium">
              Display name
            </label>
            <Input
              id="display-name"
              value={formValues.displayName}
              onChange={(event) =>
                setFormValues((previous) => ({ ...previous, displayName: event.target.value }))
              }
            />
            {errors.displayName ? <p className="text-xs text-destructive">{errors.displayName}</p> : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="degree-type" className="text-sm font-medium">
              Degree type
            </label>
            <Select
              id="degree-type"
              value={formValues.degreeType}
              onChange={(event) =>
                setFormValues((previous) => ({
                  ...previous,
                  degreeType: event.target.value as StudentProfileEditValues["degreeType"],
                }))
              }
            >
              {studentEditDegreeTypeOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
            {errors.degreeType ? <p className="text-xs text-destructive">{errors.degreeType}</p> : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="year-level" className="text-sm font-medium">
              Year level
            </label>
            <Select
              id="year-level"
              value={formValues.yearLevel}
              onChange={(event) =>
                setFormValues((previous) => ({
                  ...previous,
                  yearLevel: event.target.value as StudentProfileEditValues["yearLevel"],
                }))
              }
            >
              {studentEditYearLevelOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
            {errors.yearLevel ? <p className="text-xs text-destructive">{errors.yearLevel}</p> : null}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="department" className="text-sm font-medium">
              Department
            </label>
            <Input
              id="department"
              value={formValues.department}
              onChange={(event) =>
                setFormValues((previous) => ({ ...previous, department: event.target.value }))
              }
            />
            {errors.department ? <p className="text-xs text-destructive">{errors.department}</p> : null}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="bio" className="text-sm font-medium">
              Bio
            </label>
            <Textarea
              id="bio"
              value={formValues.bio}
              maxLength={500}
              onChange={(event) => setFormValues((previous) => ({ ...previous, bio: event.target.value }))}
              className="min-h-32"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Max 500 characters</span>
              <span>{formValues.bio.length}/500</span>
            </div>
            {errors.bio ? <p className="text-xs text-destructive">{errors.bio}</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Research Interests</CardTitle>
        </CardHeader>
        <CardContent>
          <ResearchInterestSelector
            groups={filteredInterestGroups}
            selected={formValues.interests}
            query={interestQuery}
            onQueryChange={setInterestQuery}
            onToggleInterest={toggleInterest}
            onTogglePrimary={togglePrimaryInterest}
            errorMessage={errors.interests}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skills &amp; Expertise</CardTitle>
        </CardHeader>
        <CardContent>
          <SkillSelector
            groups={filteredSkillGroups}
            selected={formValues.skills}
            query={skillQuery}
            onQueryChange={setSkillQuery}
            onToggleSkill={toggleSkill}
            onSetSkillProficiency={setSkillProficiency}
            errorMessage={errors.skills}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Availability &amp; Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Availability status</h3>
            <RadioGroup>
              {availabilityOptions.map((value) => (
                <label key={value} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <RadioGroupItem
                    name="availability"
                    value={value}
                    checked={formValues.availability === value}
                    onChange={() => setFormValues((previous) => ({ ...previous, availability: value }))}
                  />
                  {availabilityLabelMap[value]}
                </label>
              ))}
            </RadioGroup>
            {errors.availability ? <p className="text-xs text-destructive">{errors.availability}</p> : null}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Collaboration type preference</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {collaborationOptions.map((value) => (
                <label key={value} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <Checkbox
                    checked={formValues.preferredCollaborationType.includes(value)}
                    onChange={() => toggleCollaborationType(value)}
                  />
                  {collaborationLabelMap[value]}
                </label>
              ))}
            </div>
            {errors.preferredCollaborationType ? (
              <p className="text-xs text-destructive">{errors.preferredCollaborationType}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="hours-per-week" className="text-sm font-medium">
                Hours per week available
              </label>
              <Select
                id="hours-per-week"
                value={formValues.hoursPerWeek}
                onChange={(event) =>
                  setFormValues((previous) => ({
                    ...previous,
                    hoursPerWeek: event.target.value as StudentProfileEditValues["hoursPerWeek"],
                  }))
                }
              >
                {studentHoursPerWeekOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
              {errors.hoursPerWeek ? <p className="text-xs text-destructive">{errors.hoursPerWeek}</p> : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="start-date" className="text-sm font-medium">
                Start date availability
              </label>
              <Select
                id="start-date"
                value={formValues.startDateAvailability}
                onChange={(event) =>
                  setFormValues((previous) => ({
                    ...previous,
                    startDateAvailability: event.target.value as StudentProfileEditValues["startDateAvailability"],
                  }))
                }
              >
                {studentStartDateAvailabilityOptions.map((value) => (
                  <option key={value} value={value}>
                    {startDateLabelMap[value]}
                  </option>
                ))}
              </Select>
              {errors.startDateAvailability ? (
                <p className="text-xs text-destructive">{errors.startDateAvailability}</p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <label htmlFor="linkedin-url" className="text-sm font-medium">
              LinkedIn URL (optional)
            </label>
            <Input
              id="linkedin-url"
              value={formValues.linkedinUrl}
              onChange={(event) =>
                setFormValues((previous) => ({ ...previous, linkedinUrl: event.target.value }))
              }
              placeholder="https://www.linkedin.com/in/your-name"
            />
            {errors.linkedinUrl ? <p className="text-xs text-destructive">{errors.linkedinUrl}</p> : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="website-url" className="text-sm font-medium">
              Personal website URL (optional)
            </label>
            <Input
              id="website-url"
              value={formValues.websiteUrl}
              onChange={(event) =>
                setFormValues((previous) => ({ ...previous, websiteUrl: event.target.value }))
              }
              placeholder="https://your-site.example"
            />
            {errors.websiteUrl ? <p className="text-xs text-destructive">{errors.websiteUrl}</p> : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="orcid" className="text-sm font-medium">
              ORCID (optional)
            </label>
            <Input
              id="orcid"
              value={formValues.orcid}
              onChange={(event) => setFormValues((previous) => ({ ...previous, orcid: event.target.value }))}
              placeholder="0000-0000-0000-0000"
            />
            {errors.orcid ? <p className="text-xs text-destructive">{errors.orcid}</p> : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="github-url" className="text-sm font-medium">
              GitHub URL (optional)
            </label>
            <Input
              id="github-url"
              value={formValues.githubUrl}
              onChange={(event) =>
                setFormValues((previous) => ({ ...previous, githubUrl: event.target.value }))
              }
              placeholder="https://github.com/your-username"
            />
            {errors.githubUrl ? <p className="text-xs text-destructive">{errors.githubUrl}</p> : null}
          </div>
        </CardContent>
      </Card>

      <div className="hidden justify-end md:flex">
        <Button type="button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 p-4 shadow-[0_-8px_20px_rgba(0,0,0,0.08)] backdrop-blur md:hidden">
        <div className="mx-auto w-full max-w-4xl">
          <Button type="button" onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <Badge variant="secondary">
          {formValues.interests.length} interests · {formValues.skills.length} skills
        </Badge>
      </div>
    </div>
  );
}
