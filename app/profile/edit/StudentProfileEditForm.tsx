"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { ResearchInterestSelector } from "@/app/onboarding/shared/ResearchInterestSelector";
import { SkillSelector, type SkillProficiency } from "@/app/onboarding/shared/SkillSelector";
import { DeleteAccountSection } from "@/components/shared/account/DeleteAccountSection";
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

type InterestItem = {
  id: number;
  name: string;
  category: string;
};

type InterestGroup = {
  category: string;
  interests: InterestItem[];
};

type SkillItem = {
  id: number;
  name: string;
  category: string;
};

type SkillGroup = {
  category: string;
  skills: SkillItem[];
};

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
  interestGroups: initialInterestGroups,
  skillGroups: initialSkillGroups,
}: StudentProfileEditFormProps) {
  const router = useRouter();
  const [interestGroups, setInterestGroups] = useState<InterestGroup[]>(initialInterestGroups);
  const [skillGroups, setSkillGroups] = useState<SkillGroup[]>(initialSkillGroups);
  const [formValues, setFormValues] = useState<StudentProfileEditValues>(() => buildInitialValues(initialProfile));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const allInterests = useMemo(() => interestGroups.flatMap((group) => group.interests), [interestGroups]);
  const allSkills = useMemo(() => skillGroups.flatMap((group) => group.skills), [skillGroups]);

  const interestNameById = useMemo(() => {
    const map = new Map<number, string>();
    allInterests.forEach((interest) => map.set(interest.id, interest.name));
    return map;
  }, [allInterests]);

  const skillNameById = useMemo(() => {
    const map = new Map<number, string>();
    allSkills.forEach((skill) => map.set(skill.id, skill.name));
    return map;
  }, [allSkills]);

  const selectedInterestNames = useMemo(
    () =>
      formValues.interests
        .map((item) => interestNameById.get(item.interestId))
        .filter((item): item is string => Boolean(item)),
    [formValues.interests, interestNameById],
  );

  const selectedPrimaryInterestNames = useMemo(
    () =>
      formValues.interests
        .filter((item) => item.isPrimary)
        .map((item) => interestNameById.get(item.interestId))
        .filter((item): item is string => Boolean(item)),
    [formValues.interests, interestNameById],
  );

  const skillNames = useMemo(
    () =>
      formValues.skills
        .map((item) => skillNameById.get(item.skillId))
        .filter((item): item is string => Boolean(item)),
    [formValues.skills, skillNameById],
  );

  const skillProficiencyByName = useMemo(() => {
    const map: Record<string, SkillProficiency> = {};
    formValues.skills.forEach((skill) => {
      const skillName = skillNameById.get(skill.skillId);
      if (skillName) {
        const normalized =
          skill.proficiencyLevel === "expert" ? "advanced" : (skill.proficiencyLevel as SkillProficiency);
        map[skillName] = normalized;
      }
    });
    return map;
  }, [formValues.skills, skillNameById]);

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

      const primaryCount = previous.interests.filter((interest) => interest.isPrimary).length;

      return {
        ...previous,
        interests: [...previous.interests, { interestId, isPrimary: primaryCount < 3 }],
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

  const normalizeToken = (value: string) => value.trim().toLowerCase();

  const resolveInterestByName = (name: string) =>
    allInterests.find((interest) => normalizeToken(interest.name) === normalizeToken(name));

  const resolveSkillByName = (name: string) =>
    allSkills.find((skill) => normalizeToken(skill.name) === normalizeToken(name));

  const handleInterestNameChange = (nextNames: string[]) => {
    const previousNames = new Set(selectedInterestNames.map(normalizeToken));
    const nextNameSet = new Set(nextNames.map(normalizeToken));

    selectedInterestNames
      .filter((name) => !nextNameSet.has(normalizeToken(name)))
      .forEach((name) => {
        const match = resolveInterestByName(name);
        if (match) {
          toggleInterest(match.id);
        }
      });

    nextNames
      .filter((name) => !previousNames.has(normalizeToken(name)))
      .forEach((name) => {
        const existing = resolveInterestByName(name);
        if (existing) {
          toggleInterest(existing.id);
          return;
        }

        void (async () => {
          try {
            const createdInterest = await createCustomInterest(name);
            toggleInterest(createdInterest.id);
          } catch {
            setGlobalError("Could not create custom interest.");
          }
        })();
      });
  };

  const handlePrimaryInterestChange = (nextPrimaryNames: string[]) => {
    const normalizedPrimary = new Set(nextPrimaryNames.map(normalizeToken));
    setFormValues((previous) => ({
      ...previous,
      interests: previous.interests.map((interest) => {
        const interestName = interestNameById.get(interest.interestId);
        return {
          ...interest,
          isPrimary: Boolean(interestName && normalizedPrimary.has(normalizeToken(interestName))),
        };
      }),
    }));
  };

  const handleSkillNameChange = (nextSkills: string[]) => {
    const previousNames = new Set(skillNames.map(normalizeToken));
    const nextNameSet = new Set(nextSkills.map(normalizeToken));

    skillNames
      .filter((name) => !nextNameSet.has(normalizeToken(name)))
      .forEach((name) => {
        const match = resolveSkillByName(name);
        if (match) {
          toggleSkill(match.id);
        }
      });

    nextSkills
      .filter((name) => !previousNames.has(normalizeToken(name)))
      .forEach((name) => {
        const existing = resolveSkillByName(name);
        if (existing) {
          toggleSkill(existing.id);
          return;
        }

        void (async () => {
          try {
            const createdSkill = await createCustomSkill(name);
            toggleSkill(createdSkill.id);
          } catch {
            setGlobalError("Could not create custom skill.");
          }
        })();
      });
  };

  const handleSkillProficiencyChange = (nextProficiencies: Record<string, SkillProficiency>) => {
    Object.entries(nextProficiencies).forEach(([skillName, proficiency]) => {
      const match = resolveSkillByName(skillName);
      if (match) {
        setSkillProficiency(match.id, proficiency);
      }
    });
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

  const createCustomInterest = async (name: string) => {
    try {
      const createdInterest = await trpcClient.profile.createCustomInterest.mutate({ name });
      setInterestGroups((previous) => {
        const alreadyExists = previous.some((group) =>
          group.interests.some((interest) => interest.id === createdInterest.id),
        );

        if (alreadyExists) {
          return previous;
        }

        const targetGroupIndex = previous.findIndex((group) => group.category === createdInterest.category);

        if (targetGroupIndex === -1) {
          return [
            ...previous,
            {
              category: createdInterest.category,
              interests: [createdInterest],
            },
          ];
        }

        return previous.map((group, index) =>
          index === targetGroupIndex
            ? {
                ...group,
                interests: [...group.interests, createdInterest].sort((a, b) => a.name.localeCompare(b.name)),
              }
            : group,
        );
      });
      return createdInterest;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create custom interest.";
      setGlobalError(message);
      throw error;
    }
  };

  const createCustomSkill = async (name: string) => {
    try {
      const createdSkill = await trpcClient.profile.createCustomSkill.mutate({ name });
      setSkillGroups((previous) => {
        const alreadyExists = previous.some((group) =>
          group.skills.some((skill) => skill.id === createdSkill.id),
        );

        if (alreadyExists) {
          return previous;
        }

        const targetGroupIndex = previous.findIndex((group) => group.category === createdSkill.category);

        if (targetGroupIndex === -1) {
          return [
            ...previous,
            {
              category: createdSkill.category,
              skills: [createdSkill],
            },
          ];
        }

        return previous.map((group, index) =>
          index === targetGroupIndex
            ? {
                ...group,
                skills: [...group.skills, createdSkill].sort((a, b) => a.name.localeCompare(b.name)),
              }
            : group,
        );
      });
      return createdSkill;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create custom skill.";
      setGlobalError(message);
      throw error;
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
            value={selectedInterestNames}
            onChange={handleInterestNameChange}
            primaryInterests={selectedPrimaryInterestNames}
            onPrimaryChange={handlePrimaryInterestChange}
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
            value={skillNames}
            onChange={handleSkillNameChange}
            proficiencyBySkill={skillProficiencyByName}
            onProficiencyChange={handleSkillProficiencyChange}
            maxSelections={10}
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

      <div className="border-t border-border/70 pt-6">
        <DeleteAccountSection ownerType="student" />
      </div>

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
