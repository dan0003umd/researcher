"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { ResearchInterestSelector } from "@/app/onboarding/shared/ResearchInterestSelector";
import { SkillSelector, type SkillProficiency } from "@/app/onboarding/shared/SkillSelector";
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
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [showSubmitSuccess, setShowSubmitSuccess] = useState(false);

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

  const submitProfile = async () => {
    const parsed = facultyProfileFormSchema.safeParse(formValues);

    if (!parsed.success) {
      setGlobalError(parsed.error.issues[0]?.message ?? "Please review your faculty profile.");
      return;
    }

    setIsSubmitting(true);
    setShowSubmitSuccess(false);
    setGlobalError(null);

    try {
      await trpcClient.profile.createFacultyProfile.mutate(parsed.data);
      setShowSubmitSuccess(true);
      await new Promise((resolve) => {
        window.setTimeout(resolve, 350);
      });
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
    <div className="faculty-focus mx-auto w-full max-w-4xl space-y-5">
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
              value={selectedInterestNames}
              onChange={handleInterestNameChange}
              primaryInterests={selectedPrimaryInterestNames}
              onPrimaryChange={handlePrimaryInterestChange}
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
                  value={skillNames}
                  onChange={handleSkillNameChange}
                  proficiencyBySkill={skillProficiencyByName}
                  onProficiencyChange={handleSkillProficiencyChange}
                  maxSelections={10}
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
            <Button type="button" variant="faculty" onClick={submitProfile} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving profile...
                </>
              ) : showSubmitSuccess ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Submitted
                </>
              ) : (
                "Submit profile"
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

