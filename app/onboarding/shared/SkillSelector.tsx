"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

export const SKILLS = [
  "Python",
  "JavaScript",
  "TypeScript",
  "R",
  "MATLAB",
  "Julia",
  "C++",
  "Java",
  "Go",
  "Rust",
  "SQL",
  "NoSQL",
  "TensorFlow",
  "PyTorch",
  "Keras",
  "scikit-learn",
  "Hugging Face",
  "React",
  "Next.js",
  "Node.js",
  "FastAPI",
  "Django",
  "Flask",
  "Docker",
  "Kubernetes",
  "AWS",
  "Google Cloud",
  "Azure",
  "Git",
  "Linux",
  "Bash",
  "LaTeX",
  "CUDA",
  "Data Analysis",
  "Statistical Modeling",
  "Data Visualization",
  "Research Design",
  "Scientific Writing",
  "Literature Review",
  "Wet Lab Techniques",
  "PCR",
  "Cell Culture",
  "Microscopy",
  "Survey Design",
  "Qualitative Research",
  "Ethnography",
  "Signal Processing",
  "Circuit Design",
  "3D Modeling",
  "Figma",
  "UX Research",
  "Prompt Engineering",
];

export type SkillProficiency = "beginner" | "intermediate" | "advanced";

type SkillSelectorProps = {
  value: string[];
  onChange: (value: string[]) => void;
  proficiencyBySkill?: Record<string, SkillProficiency>;
  onProficiencyChange?: (value: Record<string, SkillProficiency>) => void;
  maxSelections?: number;
  errorMessage?: string;
};

const normalize = (value: string) => value.trim().toLowerCase();
const proficiencyOrder: SkillProficiency[] = ["beginner", "intermediate", "advanced"];

const proficiencyLabelMap: Record<SkillProficiency, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const proficiencyClassMap: Record<SkillProficiency, string> = {
  beginner: "border-gray-300 bg-gray-100 text-gray-600",
  intermediate: "border-blue-200 bg-blue-100 text-blue-700",
  advanced: "border-[oklch(from_var(--color-primary)_l_c_h_/_0.24)] bg-[oklch(from_var(--color-primary)_l_c_h_/_0.14)] text-primary",
};

export function SkillSelector({
  value,
  onChange,
  proficiencyBySkill = {},
  onProficiencyChange,
  maxSelections = 15,
  errorMessage,
}: SkillSelectorProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const normalizedSelected = useMemo(() => new Set(value.map(normalize)), [value]);
  const canAddMore = value.length < maxSelections;

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalize(query);

    if (!normalizedQuery) {
      return [];
    }

    return SKILLS.filter((item) => !normalizedSelected.has(normalize(item)))
      .filter((item) => normalize(item).includes(normalizedQuery))
      .slice(0, 8);
  }, [query, normalizedSelected]);

  const hasExactMatch = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) {
      return false;
    }

    return SKILLS.some((item) => normalize(item) === normalizedQuery);
  }, [query]);

  const addSkill = (raw: string) => {
    const nextValue = raw.trim();
    if (!nextValue || !canAddMore) {
      return;
    }

    if (normalizedSelected.has(normalize(nextValue))) {
      setQuery("");
      setIsOpen(false);
      return;
    }

    const nextSkills = [...value, nextValue];
    onChange(nextSkills);

    if (onProficiencyChange) {
      onProficiencyChange({
        ...proficiencyBySkill,
        [nextValue]: proficiencyBySkill[nextValue] ?? "beginner",
      });
    }

    setQuery("");
    setIsOpen(false);
  };

  const removeSkill = (skill: string) => {
    const nextSkills = value.filter((item) => normalize(item) !== normalize(skill));
    onChange(nextSkills);

    if (onProficiencyChange) {
      const next = { ...proficiencyBySkill };
      delete next[skill];
      onProficiencyChange(next);
    }
  };

  const cycleProficiency = (skill: string) => {
    if (!onProficiencyChange) {
      return;
    }

    const current = proficiencyBySkill[skill] ?? "beginner";
    const currentIndex = proficiencyOrder.indexOf(current);
    const next = proficiencyOrder[(currentIndex + 1) % proficiencyOrder.length];
    onProficiencyChange({
      ...proficiencyBySkill,
      [skill]: next,
    });
  };

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapperRef.current && !wrapperRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  const showDropdown = isOpen && query.trim().length > 0 && canAddMore;
  const normalizedQuery = normalize(query);
  const showCustomAdd =
    normalizedQuery.length > 0 &&
    !hasExactMatch &&
    !value.some((item) => normalize(item) === normalizedQuery);

  return (
    <div className="space-y-3" ref={wrapperRef}>
      <div className="flex items-center justify-end">
        <p className="text-xs text-muted-foreground">{value.length} skills added</p>
      </div>

      <div className="relative">
        <Input
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
              return;
            }

            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              if (filteredOptions.length > 0) {
                addSkill(filteredOptions[0]);
              } else if (query.trim().length > 0) {
                addSkill(query);
              }
            }
          }}
          placeholder="Search skills..."
          disabled={!canAddMore}
          title={!canAddMore ? `Maximum ${maxSelections} skills selected` : undefined}
          className="w-full border-border/80 focus-visible:ring-primary"
        />

        {showDropdown ? (
          <div className="absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-background shadow-md">
            {filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-primary/10"
                onClick={() => addSkill(option)}
              >
                {option}
              </button>
            ))}
            {showCustomAdd ? (
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-primary hover:bg-primary/10"
                onClick={() => addSkill(query)}
              >
                + Add &quot;{query.trim()}&quot;
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {value.map((skill) => {
          const proficiency = proficiencyBySkill[skill] ?? "beginner";

          return (
            <div
              key={skill}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-[var(--color-surface-offset)] px-2.5 py-1 text-[0.75rem] text-foreground"
            >
              <span>{skill}</span>
              <button
                type="button"
                onClick={() => cycleProficiency(skill)}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${proficiencyClassMap[proficiency]}`}
              >
                {proficiencyLabelMap[proficiency]}
              </button>
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                aria-label={`Remove ${skill}`}
                className="rounded-full p-0.5 text-muted-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
    </div>
  );
}
