"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ResearchInterestSelector, type InterestGroup } from "@/app/onboarding/shared/ResearchInterestSelector";
import { SkillSelector, type SkillGroup } from "@/app/onboarding/shared/SkillSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpcClient } from "@/lib/trpc/client";
import {
  facultyAcademicInfoSchema,
  facultyBioLinksSchema,
  facultyProfileFormSchema,
  facultyRecruitingSchema,
  facultyTitleOptions,
  soughtExperienceOptions,
  type FacultyProfileFormValues,
  type SkillProficiencyValue,
} from "@/lib/validators/profile";

type StepNumber = 1 | 2 | 3 | 4 | 5;

const stepLabels: Array<{ step: StepNumber; label: string }> = [
  { step: 1, label: "Academic Info" },
  { step: 2, label: "Research Areas" },
  { step: 3, label: "Recruiting" },
  { step: 4, label: "Bio & Links" },
  { step: 5, label: "Review" },
];

const soughtExperienceLabelMap: Record<(typeof soughtExperienceOptions)[number], string> = {
  any: "Any",
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

const defaultFormValues: FacultyProfileFormValues = {
  displayName: "",
  title: "Professor",
  department: "",
  labName: "",
  labUrl: "",
  interests: [],
  currentlyRecruiting: false,
  recruitingMessage: "",
  skills: [],
  soughtExperienceLevel: "any",
  bio: "",
  googleScholarUrl: "",
  orcidUrl: "",
  labWebsiteUrl: "",
};

export function FacultyProfileOnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [formValues, setFormValues] = useState<FacultyProfileFormValues>(defaultFormValues);
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
          trpcClient.profile.getMyFacultyProfile.query(),
        ]);

        setInterestGroups(interests as InterestGroup[]);
        setSkillGroups(skills as SkillGroup[]);

        if (existingProfile) {
          setFormValues({
            displayName: existingProfile.display_name,
            title: (existingProfile.title ?? "Professor") as FacultyProfileFormValues["title"],
            department: existingProfile.department ?? "",
            labName: existingProfile.lab_name ?? "",
            labUrl: existingProfile.lab_url ?? "",
            interests: existingProfile.interests.map((row) => ({
              interestId: row.interestId,
              isPrimary: row.isPrimary,
            })),
            currentlyRecruiting: existingProfile.currently_recruiting,
            recruitingMessage: existingProfile.recruiting_message ?? "",
            skills: existingProfile.skills.map((row) => ({
              skillId: row.skillId,
              proficiencyLevel: row.proficiencyLevel as SkillProficiencyValue,
            })),
            soughtExperienceLevel: existingProfile.desired_experience_level,
            bio: existingProfile.bio ?? "",
            googleScholarUrl: existingProfile.google_scholar_url ?? "",
            orcidUrl: existingProfile.orcid_url ?? "",
            labWebsiteUrl: existingProfile.lab_url ?? "",
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load faculty onboarding.";
        setGlobalError(message);
      } finally {
        setIsBootstrapping(false);
      }
    })();
  }, []);

  const progressValue = (currentStep / 5) * 100;

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1: {
        const parsed = facultyAcademicInfoSchema.safeParse({
          displayName: formValues.displayName,
          title: formValues.title,
          department: formValues.department,
          labName: formValues.labName,
          labUrl: formValues.labUrl,
        });

        if (!parsed.success) {
          const nextErrors: Record<string, string> = {};
          parsed.error.issues.forEach((issue) => {
            const field = issue.path[0]?.toString() ?? "academic";
            nextErrors[field] = issue.message;
          });
          setErrors(nextErrors);
          return false;
        }

        break;
      }
      case 2: {
        const parsed = facultyProfileFormSchema.shape.interests.safeParse(formValues.interests);
        if (!parsed.success) {
          setErrors({ interests: parsed.error.issues[0]?.message ?? "Review interests and try again." });
          return false;
        }
        break;
      }
      case 3: {
        const parsed = facultyRecruitingSchema.safeParse({
          currentlyRecruiting: formValues.currentlyRecruiting,
          recruitingMessage: formValues.recruitingMessage,
          skills: formValues.skills,
          soughtExperienceLevel: formValues.soughtExperienceLevel,
        });

        if (!parsed.success) {
          const nextErrors: Record<string, string> = {};
          parsed.error.issues.forEach((issue) => {
            const field = issue.path[0]?.toString() ?? "recruiting";
            nextErrors[field] = issue.message;
          });
          setErrors(nextErrors);
          return false;
        }

        break;
      }
      case 4: {
        const parsed = facultyBioLinksSchema.safeParse({
          bio: formValues.bio,
          googleScholarUrl: formValues.googleScholarUrl,
          orcidUrl: formValues.orcidUrl,
          labWebsiteUrl: formValues.labWebsiteUrl,
        });

        if (!parsed.success) {
          const nextErrors: Record<string, string> = {};
          parsed.error.issues.forEach((issue) => {
            const field = issue.path[0]?.toString() ?? "bio";
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

    setCurrentStep((prev) => {
      if (prev === 5) {
        return 5;
      }

      return (prev + 1) as StepNumber;
    });
  };

  const goBack = () => {
    setCurrentStep((prev) => {
      if (prev === 1) {
        return 1;
      }

      return (prev - 1) as StepNumber;
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

  const submitProfile = async () => {
    const parsed = facultyProfileFormSchema.safeParse(formValues);

    if (!parsed.success) {
      setGlobalError(parsed.error.issues[0]?.message ?? "Please review your faculty profile.");
      return;
    }

    setIsSubmitting(true);
    setGlobalError(null);

    try {
      await trpcClient.profile.createFacultyProfile.mutate(parsed.data);
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not submit faculty profile.";
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
    return <p className="text-sm text-muted-foreground">Loading faculty onboarding...</p>;
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <Card>
        <CardHeader className="space-y-4">
          <div className="space-y-2">
            <CardTitle>Faculty Profile Setup</CardTitle>
            <CardDescription>
              Step {currentStep} of 5. Signal your lab priorities clearly for strong matches.
            </CardDescription>
          </div>
          <Progress value={progressValue} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
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
                <label className="text-sm font-medium" htmlFor="display-name">Display name</label>
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
                <label className="text-sm font-medium" htmlFor="title">Title</label>
                <Select
                  id="title"
                  value={formValues.title}
                  onChange={(event) =>
                    setFormValues((previous) => ({
                      ...previous,
                      title: event.target.value as FacultyProfileFormValues["title"],
                    }))
                  }
                >
                  {facultyTitleOptions.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </Select>
                {errors.title ? <p className="text-xs text-destructive">{errors.title}</p> : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="department">Department</label>
                <Input
                  id="department"
                  value={formValues.department}
                  onChange={(event) =>
                    setFormValues((previous) => ({ ...previous, department: event.target.value }))
                  }
                />
                {errors.department ? <p className="text-xs text-destructive">{errors.department}</p> : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="lab-name">Lab name (optional)</label>
                <Input
                  id="lab-name"
                  value={formValues.labName}
                  onChange={(event) =>
                    setFormValues((previous) => ({ ...previous, labName: event.target.value }))
                  }
                />
                {errors.labName ? <p className="text-xs text-destructive">{errors.labName}</p> : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="lab-url">Lab URL (optional)</label>
                <Input
                  id="lab-url"
                  value={formValues.labUrl}
                  onChange={(event) =>
                    setFormValues((previous) => ({ ...previous, labUrl: event.target.value }))
                  }
                  placeholder="https://"
                />
                {errors.labUrl ? <p className="text-xs text-destructive">{errors.labUrl}</p> : null}
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
            <div className="space-y-5">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Currently recruiting?</h3>
                <RadioGroup>
                  <label className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <RadioGroupItem
                      name="recruiting"
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
                      name="recruiting"
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

              {formValues.currentlyRecruiting ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="recruiting-message">
                    What kind of student are you looking for?
                  </label>
                  <Textarea
                    id="recruiting-message"
                    value={formValues.recruitingMessage}
                    maxLength={300}
                    onChange={(event) =>
                      setFormValues((previous) => ({ ...previous, recruitingMessage: event.target.value }))
                    }
                  />
                  <div className="text-xs text-muted-foreground">{formValues.recruitingMessage.length}/300</div>
                  {errors.recruitingMessage ? (
                    <p className="text-xs text-destructive">{errors.recruitingMessage}</p>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Experience level sought</h3>
                <RadioGroup>
                  {soughtExperienceOptions.map((value) => (
                    <label key={value} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                      <RadioGroupItem
                        name="soughtExperience"
                        value={value}
                        checked={formValues.soughtExperienceLevel === value}
                        onChange={() =>
                          setFormValues((previous) => ({
                            ...previous,
                            soughtExperienceLevel: value,
                          }))
                        }
                      />
                      {soughtExperienceLabelMap[value]}
                    </label>
                  ))}
                </RadioGroup>
                {errors.soughtExperienceLevel ? (
                  <p className="text-xs text-destructive">{errors.soughtExperienceLevel}</p>
                ) : null}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">Desired skills in students</h3>
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
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="bio">Bio</label>
                <Textarea
                  id="bio"
                  value={formValues.bio}
                  maxLength={500}
                  onChange={(event) =>
                    setFormValues((previous) => ({ ...previous, bio: event.target.value }))
                  }
                />
                <div className="text-xs text-muted-foreground">{formValues.bio.length}/500</div>
                {errors.bio ? <p className="text-xs text-destructive">{errors.bio}</p> : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="lab-website-url">Lab website (optional)</label>
                <Input
                  id="lab-website-url"
                  value={formValues.labWebsiteUrl}
                  onChange={(event) =>
                    setFormValues((previous) => ({ ...previous, labWebsiteUrl: event.target.value }))
                  }
                  placeholder="https://"
                />
                {errors.labWebsiteUrl ? (
                  <p className="text-xs text-destructive">{errors.labWebsiteUrl}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="scholar-url">Google Scholar URL (optional)</label>
                <Input
                  id="scholar-url"
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
                <label className="text-sm font-medium" htmlFor="orcid-url">ORCID URL (optional)</label>
                <Input
                  id="orcid-url"
                  value={formValues.orcidUrl}
                  onChange={(event) =>
                    setFormValues((previous) => ({ ...previous, orcidUrl: event.target.value }))
                  }
                  placeholder="https://orcid.org/..."
                />
                {errors.orcidUrl ? <p className="text-xs text-destructive">{errors.orcidUrl}</p> : null}
              </div>
            </div>
          ) : null}

          {currentStep === 5 ? (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Academic Info</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
                    Edit
                  </Button>
                </div>
                <p className="text-sm">{formValues.displayName}</p>
                <p className="text-sm text-muted-foreground">
                  {formValues.title} · {formValues.department}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Research Areas ({formValues.interests.length})</h3>
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
                  <h3 className="text-sm font-semibold">Recruiting & Skills</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCurrentStep(3)}>
                    Edit
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formValues.currentlyRecruiting ? "Currently recruiting" : "Not recruiting now"}
                </p>
                {formValues.currentlyRecruiting && formValues.recruitingMessage ? (
                  <p className="text-sm text-muted-foreground">{formValues.recruitingMessage}</p>
                ) : null}
                <p className="text-sm text-muted-foreground">
                  Sought experience: {soughtExperienceLabelMap[formValues.soughtExperienceLevel]}
                </p>
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
                  <h3 className="text-sm font-semibold">Bio & Links</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCurrentStep(4)}>
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

          {currentStep < 5 ? (
            <Button type="button" onClick={goNext}>Next</Button>
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

