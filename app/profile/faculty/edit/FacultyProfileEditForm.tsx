"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { ResearchInterestSelector, type InterestGroup } from "@/app/onboarding/shared/ResearchInterestSelector";
import { SkillSelector, type SkillGroup } from "@/app/onboarding/shared/SkillSelector";
import { DeleteAccountSection } from "@/components/shared/account/DeleteAccountSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpcClient } from "@/lib/trpc/client";
import {
  facultyProfileEditSchema,
  facultySoughtStudentLevelOptions,
  facultyTitleOptions,
  type FacultyProfileEditValues,
  type SkillProficiencyValue,
} from "@/lib/validators/profile";

type FacultyProfileData = {
  display_name: string;
  title: string | null;
  department: string | null;
  lab_name: string | null;
  lab_url: string | null;
  bio: string | null;
  currently_recruiting: boolean;
  recruiting_message: string | null;
  desired_experience_level: "any" | "beginner" | "intermediate" | "advanced";
  google_scholar_url: string | null;
  sought_student_levels: string[] | null;
  personal_website_url: string | null;
  interests: Array<{
    interestId: number;
    isPrimary: boolean;
  }>;
  skills: Array<{
    skillId: number;
    proficiencyLevel: SkillProficiencyValue;
  }>;
} | null;

type FacultyProfileEditFormProps = {
  initialProfile: FacultyProfileData;
  interestGroups: InterestGroup[];
  skillGroups: SkillGroup[];
  initialNotice?: string;
};

const studentLevelLabelMap: Record<(typeof facultySoughtStudentLevelOptions)[number], string> = {
  undergrad: "Undergrad",
  ms: "MS",
  phd: "PhD",
};

function normalizeTitle(value: string | null | undefined): FacultyProfileEditValues["title"] {
  if (!value) {
    return "Professor";
  }

  return facultyTitleOptions.includes(value as FacultyProfileEditValues["title"])
    ? (value as FacultyProfileEditValues["title"])
    : "Professor";
}

function mapLegacyExperienceToLevels(value: "any" | "beginner" | "intermediate" | "advanced" | null | undefined) {
  if (value === "beginner") {
    return ["undergrad"] as FacultyProfileEditValues["soughtStudentLevels"];
  }

  if (value === "advanced") {
    return ["phd"] as FacultyProfileEditValues["soughtStudentLevels"];
  }

  if (value === "intermediate") {
    return ["undergrad", "ms"] as FacultyProfileEditValues["soughtStudentLevels"];
  }

  return ["undergrad", "ms", "phd"] as FacultyProfileEditValues["soughtStudentLevels"];
}

function normalizeSoughtLevels(profile: FacultyProfileData) {
  if (!profile) {
    return ["undergrad", "ms", "phd"] as FacultyProfileEditValues["soughtStudentLevels"];
  }

  if (Array.isArray(profile.sought_student_levels) && profile.sought_student_levels.length > 0) {
    const normalized = profile.sought_student_levels.filter(
      (value): value is FacultyProfileEditValues["soughtStudentLevels"][number] =>
        facultySoughtStudentLevelOptions.includes(value as FacultyProfileEditValues["soughtStudentLevels"][number]),
    );

    if (normalized.length > 0) {
      return Array.from(new Set(normalized));
    }
  }

  return mapLegacyExperienceToLevels(profile.desired_experience_level);
}

function buildInitialValues(profile: FacultyProfileData): FacultyProfileEditValues {
  if (!profile) {
    return {
      displayName: "",
      title: "Professor",
      department: "",
      labName: "",
      bio: "",
      interests: [],
      currentlyRecruiting: false,
      soughtStudentLevels: ["undergrad", "ms", "phd"],
      skills: [],
      recruitingMessage: "",
      labWebsiteUrl: "",
      googleScholarUrl: "",
      personalWebsiteUrl: "",
    };
  }

  return {
    displayName: profile.display_name ?? "",
    title: normalizeTitle(profile.title),
    department: profile.department ?? "",
    labName: profile.lab_name ?? "",
    bio: profile.bio ?? "",
    interests: profile.interests,
    currentlyRecruiting: profile.currently_recruiting,
    soughtStudentLevels: normalizeSoughtLevels(profile),
    skills: profile.skills,
    recruitingMessage: profile.recruiting_message ?? "",
    labWebsiteUrl: profile.lab_url ?? "",
    googleScholarUrl: profile.google_scholar_url ?? "",
    personalWebsiteUrl: profile.personal_website_url ?? "",
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

export function FacultyProfileEditForm({
  initialProfile,
  interestGroups: initialInterestGroups,
  skillGroups: initialSkillGroups,
  initialNotice,
}: FacultyProfileEditFormProps) {
  const router = useRouter();
  const [interestGroups, setInterestGroups] = useState<InterestGroup[]>(initialInterestGroups);
  const [skillGroups, setSkillGroups] = useState<SkillGroup[]>(initialSkillGroups);
  const [formValues, setFormValues] = useState<FacultyProfileEditValues>(() => buildInitialValues(initialProfile));
  const [interestQuery, setInterestQuery] = useState("");
  const [skillQuery, setSkillQuery] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(initialNotice ?? null);

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

  const toggleStudentLevel = (value: (typeof facultySoughtStudentLevelOptions)[number]) => {
    setFormValues((previous) => {
      const exists = previous.soughtStudentLevels.includes(value);
      const next = exists
        ? previous.soughtStudentLevels.filter((item) => item !== value)
        : [...previous.soughtStudentLevels, value];

      return {
        ...previous,
        soughtStudentLevels: next,
      };
    });
  };

  const handleSave = async () => {
    setErrors({});
    setGlobalError(null);

    const parsed = facultyProfileEditSchema.safeParse(formValues);

    if (!parsed.success) {
      setErrors(mapValidationIssues(parsed.error));
      setGlobalError("Please review the highlighted fields.");
      return;
    }

    setIsSaving(true);

    try {
      await trpcClient.profile.updateFacultyProfile.mutate(parsed.data);
      setToastMessage("Profile updated successfully");
      window.setTimeout(() => setToastMessage(null), 2500);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update your lab profile.";
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
      {toastMessage ? (
        <div className="fixed right-4 top-20 z-50 rounded-md border border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-900 shadow-sm">
          {toastMessage}
        </div>
      ) : null}

      <header className="space-y-2">
        <Link href="/dashboard" className="text-sm text-primary underline-offset-4 hover:underline">
          {"\u2190"} Dashboard
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Edit Lab Profile</h1>
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
            <label htmlFor="title" className="text-sm font-medium">
              Title / Position
            </label>
            <Select
              id="title"
              value={formValues.title}
              onChange={(event) =>
                setFormValues((previous) => ({
                  ...previous,
                  title: event.target.value as FacultyProfileEditValues["title"],
                }))
              }
            >
              {facultyTitleOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
            {errors.title ? <p className="text-xs text-destructive">{errors.title}</p> : null}
          </div>

          <div className="space-y-2">
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
            <label htmlFor="lab-name" className="text-sm font-medium">
              Lab name (optional)
            </label>
            <Input
              id="lab-name"
              value={formValues.labName}
              onChange={(event) =>
                setFormValues((previous) => ({ ...previous, labName: event.target.value }))
              }
            />
            {errors.labName ? <p className="text-xs text-destructive">{errors.labName}</p> : null}
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
          <CardTitle>Research Areas</CardTitle>
        </CardHeader>
        <CardContent>
          <ResearchInterestSelector
            groups={interestGroups}
            selected={formValues.interests}
            query={interestQuery}
            onQueryChange={setInterestQuery}
            onToggleInterest={toggleInterest}
            onTogglePrimary={togglePrimaryInterest}
            onCreateCustomInterest={createCustomInterest}
            errorMessage={errors.interests}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recruiting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Currently recruiting</h3>
            <RadioGroup>
              <label className="flex items-center gap-2 rounded-md border p-2 text-sm">
                <RadioGroupItem
                  name="currently-recruiting"
                  value="yes"
                  checked={formValues.currentlyRecruiting}
                  onChange={() =>
                    setFormValues((previous) => ({ ...previous, currentlyRecruiting: true }))
                  }
                />
                Yes
              </label>
              <label className="flex items-center gap-2 rounded-md border p-2 text-sm">
                <RadioGroupItem
                  name="currently-recruiting"
                  value="no"
                  checked={!formValues.currentlyRecruiting}
                  onChange={() =>
                    setFormValues((previous) => ({ ...previous, currentlyRecruiting: false }))
                  }
                />
                Not right now
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Experience level sought</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              {facultySoughtStudentLevelOptions.map((value) => (
                <label key={value} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <Checkbox
                    checked={formValues.soughtStudentLevels.includes(value)}
                    onChange={() => toggleStudentLevel(value)}
                  />
                  {studentLevelLabelMap[value]}
                </label>
              ))}
            </div>
            {errors.soughtStudentLevels ? (
              <p className="text-xs text-destructive">{errors.soughtStudentLevels}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Skills wanted</h3>
            <SkillSelector
              groups={skillGroups}
              selected={formValues.skills}
              query={skillQuery}
              onQueryChange={setSkillQuery}
              onToggleSkill={toggleSkill}
              onSetSkillProficiency={setSkillProficiency}
              onCreateCustomSkill={createCustomSkill}
              errorMessage={errors.skills}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="recruiting-message" className="text-sm font-medium">
              Recruiting message
            </label>
            <Textarea
              id="recruiting-message"
              value={formValues.recruitingMessage}
              maxLength={300}
              onChange={(event) =>
                setFormValues((previous) => ({ ...previous, recruitingMessage: event.target.value }))
              }
              className="min-h-28"
              placeholder="What kind of student are you looking for?"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Max 300 characters</span>
              <span>{formValues.recruitingMessage.length}/300</span>
            </div>
            {errors.recruitingMessage ? (
              <p className="text-xs text-destructive">{errors.recruitingMessage}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <label htmlFor="lab-website-url" className="text-sm font-medium">
              Lab website URL (optional)
            </label>
            <Input
              id="lab-website-url"
              value={formValues.labWebsiteUrl}
              onChange={(event) =>
                setFormValues((previous) => ({ ...previous, labWebsiteUrl: event.target.value }))
              }
              placeholder="https://"
            />
            {errors.labWebsiteUrl ? <p className="text-xs text-destructive">{errors.labWebsiteUrl}</p> : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="google-scholar-url" className="text-sm font-medium">
              Google Scholar URL (optional)
            </label>
            <Input
              id="google-scholar-url"
              value={formValues.googleScholarUrl}
              onChange={(event) =>
                setFormValues((previous) => ({ ...previous, googleScholarUrl: event.target.value }))
              }
              placeholder="https://scholar.google.com/..."
            />
            {errors.googleScholarUrl ? (
              <p className="text-xs text-destructive">{errors.googleScholarUrl}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="personal-website-url" className="text-sm font-medium">
              Personal website URL (optional)
            </label>
            <Input
              id="personal-website-url"
              value={formValues.personalWebsiteUrl}
              onChange={(event) =>
                setFormValues((previous) => ({ ...previous, personalWebsiteUrl: event.target.value }))
              }
              placeholder="https://"
            />
            {errors.personalWebsiteUrl ? (
              <p className="text-xs text-destructive">{errors.personalWebsiteUrl}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="border-t border-border/70 pt-6">
        <DeleteAccountSection ownerType="faculty" />
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
    </div>
  );
}
