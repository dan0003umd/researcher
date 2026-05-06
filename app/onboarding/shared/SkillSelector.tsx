"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { skillProficiencyOptions, type SkillProficiencyValue } from "@/lib/validators/profile";

export type SkillItem = {
  id: number;
  name: string;
  category: string;
};

export type SkillGroup = {
  category: string;
  skills: SkillItem[];
};

export type SkillSelection = {
  skillId: number;
  proficiencyLevel: SkillProficiencyValue;
};

type SkillSelectorProps = {
  groups: SkillGroup[];
  selected: SkillSelection[];
  query: string;
  onQueryChange: (value: string) => void;
  onToggleSkill: (skillId: number) => void;
  onSetSkillProficiency: (skillId: number, proficiencyLevel: SkillProficiencyValue) => void;
  onCreateCustomSkill?: (name: string) => Promise<SkillItem>;
  maxSelectable?: number;
  errorMessage?: string;
};

const proficiencyLabelMap: Record<SkillProficiencyValue, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
};

export function SkillSelector({
  groups,
  selected,
  query,
  onQueryChange,
  onToggleSkill,
  onSetSkillProficiency,
  onCreateCustomSkill,
  maxSelectable = 10,
  errorMessage,
}: SkillSelectorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const selectedIds = useMemo(() => new Set(selected.map((item) => item.skillId)), [selected]);
  const allSkills = useMemo(() => groups.flatMap((group) => group.skills), [groups]);
  const skillById = useMemo(() => {
    const map = new Map<number, SkillItem>();
    allSkills.forEach((skill) => {
      map.set(skill.id, skill);
    });
    return map;
  }, [allSkills]);

  const normalizedQuery = query.trim().toLowerCase();
  const matchingSkills = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return allSkills
      .filter((skill) => !selectedIds.has(skill.id))
      .filter((skill) => skill.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 8);
  }, [allSkills, normalizedQuery, selectedIds]);

  const canAddMore = selected.length < maxSelectable;
  const visibleErrorMessage = selected.length > 0 ? null : errorMessage;

  const addSkillFromInput = async () => {
    const rawValue = query.replace(/,+$/, "").trim();

    if (!rawValue || !canAddMore) {
      return;
    }

    const existing = allSkills.find((skill) => skill.name.toLowerCase() === rawValue.toLowerCase());

    if (existing) {
      if (!selectedIds.has(existing.id)) {
        onToggleSkill(existing.id);
      }
      onQueryChange("");
      return;
    }

    if (!onCreateCustomSkill) {
      return;
    }

    setIsCreating(true);
    try {
      const customSkill = await onCreateCustomSkill(rawValue);
      if (!selectedIds.has(customSkill.id)) {
        onToggleSkill(customSkill.id);
      }
      onQueryChange("");
    } finally {
      setIsCreating(false);
    }
  };

  const handleQueryKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      void addSkillFromInput();
    }
  };

  const hasDropdown = normalizedQuery.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="w-full space-y-2 sm:max-w-sm">
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={handleQueryKeyDown}
            placeholder="Search skills"
            aria-label="Search and add skills"
            disabled={isCreating}
          />
          {hasDropdown ? (
            <div className="rounded-md border border-border/90 bg-card shadow-sm">
              {matchingSkills.length > 0 ? (
                <ul className="max-h-56 overflow-y-auto p-1">
                  {matchingSkills.map((skill) => (
                    <li key={skill.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!canAddMore) {
                            return;
                          }
                          onToggleSkill(skill.id);
                          onQueryChange("");
                        }}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                        disabled={!canAddMore}
                      >
                        <span>{skill.name}</span>
                        <span className="text-xs text-muted-foreground">{skill.category}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    void addSkillFromInput();
                  }}
                  className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                  disabled={!canAddMore || !onCreateCustomSkill || isCreating}
                >
                  {isCreating ? "Adding..." : `Add "${query.trim()}" as a custom skill`}
                </button>
              )}
            </div>
          ) : null}
        </div>
        <Badge variant="secondary">{selected.length}/{maxSelectable} selected</Badge>
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((selection) => {
            const skill = skillById.get(selection.skillId);
            const skillName = skill?.name ?? `Skill #${selection.skillId}`;

            return (
              <div
                key={selection.skillId}
                className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background px-2 py-1"
              >
                <span className="text-xs font-medium">{skillName}</span>
                <Select
                  value={selection.proficiencyLevel}
                  onChange={(event) =>
                    onSetSkillProficiency(selection.skillId, event.target.value as SkillProficiencyValue)
                  }
                  className="h-7 w-32 text-xs"
                >
                  {skillProficiencyOptions.map((value) => (
                    <option key={value} value={value}>
                      {proficiencyLabelMap[value]}
                    </option>
                  ))}
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="rounded-full"
                  onClick={() => onToggleSkill(selection.skillId)}
                  aria-label={`Remove ${skillName}`}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}

      {visibleErrorMessage ? <p className="text-sm text-destructive">{visibleErrorMessage}</p> : null}

      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.category} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">{group.category}</h3>
            <div className="grid gap-2">
              {group.skills.map((skill) => {
                const selectedSkill = selected.find((item) => item.skillId === skill.id);
                const isSelected = selectedIds.has(skill.id);

                return (
                  <div
                    key={skill.id}
                    className="flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={isSelected ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => onToggleSkill(skill.id)}
                        disabled={!isSelected && !canAddMore}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </Button>
                      <span className={isSelected ? "text-sm font-semibold" : "text-sm text-muted-foreground"}>
                        {skill.name}
                      </span>
                    </div>
                    {isSelected && selectedSkill ? (
                      <Select
                        value={selectedSkill.proficiencyLevel}
                        onChange={(event) =>
                          onSetSkillProficiency(skill.id, event.target.value as SkillProficiencyValue)
                        }
                        className="sm:w-48"
                      >
                        {skillProficiencyOptions.map((value) => (
                          <option key={value} value={value}>
                            {proficiencyLabelMap[value]}
                          </option>
                        ))}
                      </Select>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
