"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ResearchInterestSelector, type InterestGroup } from "@/app/onboarding/shared/ResearchInterestSelector";
import { SkillSelector, type SkillGroup } from "@/app/onboarding/shared/SkillSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpcClient } from "@/lib/trpc/client";
import {
  aboutYouSchema,
  availabilityOptions,
  basicInfoSchema,
  collaborationPreferencesSchema,
  collaborationTypeOptions,
  degreeTypeOptions,
  experienceLevelOptions,
  interestSelectionSchema,
  skillSelectionSchema,
  studentProfileFormSchema,
  type CollaborationTypeValue,
  type SkillProficiencyValue,
  type StudentProfileFormValues,
  yearLevelOptions,
} from "@/lib/validators/profile";

type StepNumber = 1 | 2 | 3 | 4 | 5 | 6;

const stepLabels: Array<{ step: StepNumber; label: string }> = [
  { step: 1, label: "Basic Info" },
  { step: 2, label: "Research Interests" },
  { step: 3, label: "Skills" },
  { step: 4, label: "Collaboration" },
  { step: 5, label: "About You" },
  { step: 6, label: "Review" },
];

const collaborationLabelMap: Record<CollaborationTypeValue, string> = {
  research_assistant: "Research Assistant",
  co_author: "Co-author",
  project_lead: "Project Lead",
  flexible: "Flexible",
};

const availabilityLabelMap: Record<(typeof availabilityOptions)[number], string> = {
  actively_looking: "Actively Looking",
  open: "Open to It",
  not_available: "Not Available",
};

const experienceLabelMap: Record<(typeof experienceLevelOptions)[number], string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const proficiencyLabelMap: Record<SkillProficiencyValue, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
};

const defaultFormValues: StudentProfileFormValues = {
  displayName: "",
  yearLevel: "Freshman",
  degreeType: "BS",
  department: "",
  interests: [],
  skills: [],
  availability: "open",
  experienceLevel: "beginner",
  preferredCollaborationType: ["research_assistant"],
  labExperience: false,
  bio: "",
  linkedinUrl: "",
  orcidUrl: "",
  websiteUrl: "",
};

function mapStoredCollaborationToForm(values: string[]) {
  const normalized = values.filter((value): value is CollaborationTypeValue =>
    collaborationTypeOptions.includes(value as CollaborationTypeValue),
  );

  const hasAllCore = ["research_assistant", "co_author", "project_lead"].every((value) =>
    normalized.includes(value as CollaborationTypeValue),
  );

  return hasAllCore ? (["flexible"] as CollaborationTypeValue[]) : normalized;
}

export function ProfileOnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [formValues, setFormValues] = useState<StudentProfileFormValues>(defaultFormValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [interestGroups, setInterestGroups] = useState<InterestGroup[]>([]);
  const [skillGroups, setSkillGroups] = useState<SkillGroup[]>([]);
  const [interestQuery, setInterestQuery] = useState("");
  const [skillQuery, setSkillQuery] = useState("");
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [interests, skills, existingProfile] = await Promise.all([
          trpcClient.profile.getResearchInterests.query(),
          trpcClient.profile.getSkills.query(),
          trpcClient.profile.getMyStudentProfile.query(),
        ]);

        setInterestGroups(interests as InterestGroup[]);
        setSkillGroups(skills as SkillGroup[]);

        if (existingProfile) {
          setFormValues({
            displayName: existingProfile.display_name,
            yearLevel: (existingProfile.year_level ?? "Freshman") as StudentProfileFormValues["yearLevel"],
            degreeType: (existingProfile.degree_type ?? "BS") as StudentProfileFormValues["degreeType"],
            department: existingProfile.department ?? "",
            interests: existingProfile.interests.map((row) => ({
              interestId: row.interestId,
              isPrimary: row.isPrimary,
            })),
            skills: existingProfile.skills.map((row) => ({
              skillId: row.skillId,
              proficiencyLevel: row.proficiencyLevel as SkillProficiencyValue,
            })),
            availability: existingProfile.availability,
            experienceLevel: existingProfile.experience_level,
            preferredCollaborationType: mapStoredCollaborationToForm(
              existingProfile.preferred_collaboration_type,
            ),
            labExperience: existingProfile.lab_experience,
            bio: existingProfile.bio ?? "",
            linkedinUrl: existingProfile.linkedin_url ?? "",
            orcidUrl: existingProfile.orcid_url ?? "",
            websiteUrl: existingProfile.website_url ?? "",
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load profile onboarding.";
        setGlobalError(message);
      } finally {
        setIsBootstrapping(false);
      }
    })();
  }, []);

  const progressValue = (currentStep / 6) * 100;

  const validateCurrentStep = () => {
    setGlobalError(null);

    switch (currentStep) {
      case 1: {
        const parsed = basicInfoSchema.safeParse({
          displayName: formValues.displayName,
          yearLevel: formValues.yearLevel,
          degreeType: formValues.degreeType,
          department: formValues.department,
        });

        if (!parsed.success) {
          const nextErrors: Record<string, string> = {};
          parsed.error.issues.forEach((issue) => {
            const field = issue.path[0]?.toString() ?? "basicInfo";
            nextErrors[field] = issue.message;
          });
          setErrors(nextErrors);
          return false;
        }

        break;
      }
      case 2: {
        const parsed = interestSelectionSchema.safeParse(formValues.interests);

        if (!parsed.success) {
          setErrors({ interests: parsed.error.issues[0]?.message ?? "Invalid interest selection." });
          return false;
        }

        break;
      }
      case 3: {
        const parsed = skillSelectionSchema.safeParse(formValues.skills);

        if (!parsed.success) {
          setErrors({ skills: parsed.error.issues[0]?.message ?? "Invalid skill selection." });
          return false;
        }

        break;
      }
      case 4: {
        const parsed = collaborationPreferencesSchema.safeParse({
          availability: formValues.availability,
          experienceLevel: formValues.experienceLevel,
          preferredCollaborationType: formValues.preferredCollaborationType,
          labExperience: formValues.labExperience,
        });

        if (!parsed.success) {
          setErrors({
            collaboration:
              parsed.error.issues[0]?.message ?? "Review collaboration preferences and try again.",
          });
          return false;
        }

        break;
      }
      case 5: {
        const parsed = aboutYouSchema.safeParse({
          bio: formValues.bio,
          linkedinUrl: formValues.linkedinUrl,
          orcidUrl: formValues.orcidUrl,
          websiteUrl: formValues.websiteUrl,
        });

        if (!parsed.success) {
          const nextErrors: Record<string, string> = {};
          parsed.error.issues.forEach((issue) => {
            const field = issue.path[0]?.toString() ?? "about";
            nextErrors[field] = issue.message;
          });
          setErrors(nextErrors);
          return false;
        }

        break;
      }
      default:
        break;
    }

    setErrors({});
    return true;
  };

  const goNext = () => {
    if (!validateCurrentStep()) {
      return;
    }

    setCurrentStep((previousStep) => {
      if (previousStep === 6) {
        return 6;
      }

      return (previousStep + 1) as StepNumber;
    });
  };

  const goBack = () => {
    setErrors({});
    setCurrentStep((previousStep) => {
      if (previousStep === 1) {
        return 1;
      }

      return (previousStep - 1) as StepNumber;
    });
  };

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

  const toggleCollaborationType = (value: CollaborationTypeValue) => {
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

  const submitProfile = async () => {
    const parsed = studentProfileFormSchema.safeParse(formValues);

    if (!parsed.success) {
      setGlobalError(parsed.error.issues[0]?.message ?? "Please review your profile details.");
      return;
    }

    setIsSubmitting(true);
    setGlobalError(null);

    try {
      await trpcClient.profile.createStudentProfile.mutate(parsed.data);
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not submit profile.";
      setGlobalError(message);
    } finally {
      setIsSubmitting(false);
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

  if (isBootstrapping) {
    return <p className="text-sm text-muted-foreground">Loading profile setup...</p>;
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <Card>
        <CardHeader className="space-y-4">
          <div className="space-y-2">
            <CardTitle>Student Profile Setup</CardTitle>
            <CardDescription>
              Step {currentStep} of 6. Complete this once to improve matching quality.
            </CardDescription>
          </div>
          <Progress value={progressValue} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
            {stepLabels.map((step) => (
              <div key={step.step} className="text-xs">
                <Badge variant={step.step === currentStep ? "default" : "secondary"}>{step.label}</Badge>
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {globalError ? <p className="text-sm text-destructive">{globalError}</p> : null}

          {currentStep === 1 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium" htmlFor="display-name">
                  Display name
                </label>
                <Input
                  id="display-name"
                  value={formValues.displayName}
                  onChange={(event) =>
                    setFormValues((previous) => ({ ...previous, displayName: event.target.value }))
                  }
                  placeholder="Your full name"
                />
                {errors.displayName ? <p className="text-xs text-destructive">{errors.displayName}</p> : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="year-level">
                  Year level
                </label>
                <Select
                  id="year-level"
                  value={formValues.yearLevel}
                  onChange={(event) =>
                    setFormValues((previous) => ({
                      ...previous,
                      yearLevel: event.target.value as StudentProfileFormValues["yearLevel"],
                    }))
                  }
                >
                  {yearLevelOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
                {errors.yearLevel ? <p className="text-xs text-destructive">{errors.yearLevel}</p> : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="degree-type">
                  Degree type
                </label>
                <Select
                  id="degree-type"
                  value={formValues.degreeType}
                  onChange={(event) =>
                    setFormValues((previous) => ({
                      ...previous,
                      degreeType: event.target.value as StudentProfileFormValues["degreeType"],
                    }))
                  }
                >
                  {degreeTypeOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
                {errors.degreeType ? <p className="text-xs text-destructive">{errors.degreeType}</p> : null}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium" htmlFor="department">
                  Department
                </label>
                <Input
                  id="department"
                  value={formValues.department}
                  onChange={(event) =>
                    setFormValues((previous) => ({ ...previous, department: event.target.value }))
                  }
                  placeholder="e.g., Computer Science"
                />
                {errors.department ? <p className="text-xs text-destructive">{errors.department}</p> : null}
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
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
          ) : null}

          {currentStep === 3 ? (
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
          ) : null}

          {currentStep === 4 ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Availability</h3>
                <RadioGroup>
                  {availabilityOptions.map((value) => (
                    <label key={value} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                      <RadioGroupItem
                        name="availability"
                        value={value}
                        checked={formValues.availability === value}
                        onChange={() =>
                          setFormValues((previous) => ({ ...previous, availability: value }))
                        }
                      />
                      {availabilityLabelMap[value]}
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Experience level</h3>
                <RadioGroup>
                  {experienceLevelOptions.map((value) => (
                    <label key={value} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                      <RadioGroupItem
                        name="experienceLevel"
                        value={value}
                        checked={formValues.experienceLevel === value}
                        onChange={() =>
                          setFormValues((previous) => ({ ...previous, experienceLevel: value }))
                        }
                      />
                      {experienceLabelMap[value]}
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Preferred collaboration type</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {collaborationTypeOptions.map((value) => (
                    <label key={value} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                      <Checkbox
                        checked={formValues.preferredCollaborationType.includes(value)}
                        onChange={() => toggleCollaborationType(value)}
                      />
                      {collaborationLabelMap[value]}
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 rounded-md border p-2 text-sm">
                <Checkbox
                  checked={formValues.labExperience}
                  onChange={(event) =>
                    setFormValues((previous) => ({ ...previous, labExperience: event.target.checked }))
                  }
                />
                I have prior lab experience.
              </label>

              {errors.collaboration ? <p className="text-sm text-destructive">{errors.collaboration}</p> : null}
            </div>
          ) : null}

          {currentStep === 5 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="bio">
                  Bio
                </label>
                <Textarea
                  id="bio"
                  value={formValues.bio}
                  maxLength={500}
                  onChange={(event) =>
                    setFormValues((previous) => ({ ...previous, bio: event.target.value }))
                  }
                  placeholder="Tell us about your interests, goals, and research background."
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Max 500 characters</span>
                  <span>{formValues.bio.length}/500</span>
                </div>
                {errors.bio ? <p className="text-xs text-destructive">{errors.bio}</p> : null}
              </div>

              <div className="grid gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="linkedin-url">
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

                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="orcid-url">
                    ORCID URL (optional)
                  </label>
                  <Input
                    id="orcid-url"
                    value={formValues.orcidUrl}
                    onChange={(event) =>
                      setFormValues((previous) => ({ ...previous, orcidUrl: event.target.value }))
                    }
                    placeholder="https://orcid.org/0000-0000-0000-0000"
                  />
                  {errors.orcidUrl ? <p className="text-xs text-destructive">{errors.orcidUrl}</p> : null}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="website-url">
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
              </div>
            </div>
          ) : null}

          {currentStep === 6 ? (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Basic Info</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
                    Edit
                  </Button>
                </div>
                <p className="text-sm">{formValues.displayName}</p>
                <p className="text-sm text-muted-foreground">
                  {formValues.yearLevel} · {formValues.degreeType} · {formValues.department}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Research Interests ({formValues.interests.length})</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCurrentStep(2)}>
                    Edit
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formValues.interests.map((interest) => {
                    const match = interestGroups
                      .flatMap((group) => group.interests)
                      .find((item) => item.id === interest.interestId);

                    return (
                      <Badge key={interest.interestId} variant={interest.isPrimary ? "default" : "secondary"}>
                        {match?.name ?? `Interest #${interest.interestId}`}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Skills ({formValues.skills.length})</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCurrentStep(3)}>
                    Edit
                  </Button>
                </div>
                <div className="space-y-1">
                  {formValues.skills.map((skill) => {
                    const match = skillGroups.flatMap((group) => group.skills).find((item) => item.id === skill.skillId);
                    return (
                      <p key={skill.skillId} className="text-sm text-muted-foreground">
                        {match?.name ?? `Skill #${skill.skillId}`} · {proficiencyLabelMap[skill.proficiencyLevel]}
                      </p>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Collaboration Preferences</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCurrentStep(4)}>
                    Edit
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {availabilityLabelMap[formValues.availability]} · {experienceLabelMap[formValues.experienceLevel]}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formValues.preferredCollaborationType.map((value) => collaborationLabelMap[value]).join(", ")}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">About You</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCurrentStep(5)}>
                    Edit
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{formValues.bio}</p>
              </div>
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="justify-between gap-3">
          <Button type="button" variant="outline" onClick={goBack} disabled={currentStep === 1 || isSubmitting}>
            Back
          </Button>

          {currentStep < 6 ? (
            <Button type="button" onClick={goNext}>
              Next
            </Button>
          ) : (
            <Button type="button" onClick={submitProfile} disabled={isSubmitting}>
              {isSubmitting ? "Saving profile..." : "Submit profile"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
