"use client";

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
  maxSelectable = 10,
  errorMessage,
}: SkillSelectorProps) {
  const selectedIds = new Set(selected.map((item) => item.skillId));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search skills"
          className="w-full sm:max-w-sm"
        />
        <Badge variant="secondary">{selected.length}/{maxSelectable} selected</Badge>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

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
                        disabled={!isSelected && selected.length >= maxSelectable}
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

