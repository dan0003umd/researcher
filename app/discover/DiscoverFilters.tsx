"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type InterestOption = {
  id: number;
  name: string;
  category: string;
  parent_id: number | null;
};

export type InterestGroup = {
  category: string;
  interests: InterestOption[];
};

export type DiscoverFilterState = {
  interests: string[];
  department: string;
  recruiting: boolean;
  experienceLevel: "" | "any" | "beginner" | "intermediate" | "advanced";
};

type DiscoverFiltersProps = {
  groups: InterestGroup[];
  filters: DiscoverFilterState;
  onChange: (next: DiscoverFilterState) => void;
  onClearAll: () => void;
};

type FilterFormProps = {
  groups: InterestGroup[];
  filters: DiscoverFilterState;
  onChange: (next: DiscoverFilterState) => void;
  onClearAll: () => void;
};

function FilterForm({ groups, filters, onChange, onClearAll }: FilterFormProps) {
  const selectedInterestIds = new Set(filters.interests);

  const toggleInterest = (interestId: string, checked: boolean) => {
    const nextInterests = checked
      ? Array.from(new Set([...filters.interests, interestId]))
      : filters.interests.filter((value) => value !== interestId);

    onChange({
      ...filters,
      interests: nextInterests,
    });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="department" className="text-sm font-medium">
          Department / Keyword
        </label>
        <Input
          id="department"
          value={filters.department}
          onChange={(event) =>
            onChange({
              ...filters,
              department: event.target.value,
            })
          }
          placeholder="e.g. Computer Science"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="experienceLevel" className="text-sm font-medium">
          Experience Level Sought
        </label>
        <Select
          id="experienceLevel"
          value={filters.experienceLevel}
          onChange={(event) =>
            onChange({
              ...filters,
              experienceLevel: event.target.value as DiscoverFilterState["experienceLevel"],
            })
          }
        >
          <option value="">Any</option>
          <option value="any">Any</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </Select>
      </div>

      <label className="flex items-center gap-3 rounded-md border border-border/80 bg-card px-3 py-2 text-sm">
        <Checkbox
          checked={filters.recruiting}
          onChange={(event) =>
            onChange({
              ...filters,
              recruiting: event.target.checked,
            })
          }
        />
        Open to students
      </label>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Research Interests</p>
          <p className="text-xs text-muted-foreground">{selectedInterestIds.size} selected</p>
        </div>
        <div className="max-h-72 space-y-4 overflow-y-auto rounded-md border border-border/80 bg-card/50 p-3">
          {groups.map((group) => (
            <fieldset key={group.category} className="space-y-2">
              <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {group.category}
              </legend>
              <div className="space-y-1.5">
                {group.interests.map((interest) => {
                  const value = String(interest.id);

                  return (
                    <label key={interest.id} className="flex items-center gap-2 text-sm text-foreground/90">
                      <Checkbox
                        checked={selectedInterestIds.has(value)}
                        onChange={(event) => toggleInterest(value, event.target.checked)}
                      />
                      <span>{interest.name}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <p className="text-xs text-muted-foreground">Filters update automatically</p>
        <button type="button" onClick={onClearAll} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          Clear
        </button>
      </div>
    </div>
  );
}

export function DiscoverFilters({ groups, filters, onChange, onClearAll }: DiscoverFiltersProps) {
  const [isMobileOpen, setMobileOpen] = useState(false);
  const activeFilterCount =
    filters.interests.length +
    (filters.department ? 1 : 0) +
    (filters.recruiting ? 1 : 0) +
    (filters.experienceLevel ? 1 : 0);

  return (
    <>
      <div className="md:hidden">
        <Button type="button" variant="outline" onClick={() => setMobileOpen(true)} className="w-full justify-start">
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filters
          {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </Button>
      </div>

      <aside className="hidden md:block">
        <div className="sticky top-24 rounded-xl border border-border/90 bg-card/60 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">Filters</h2>
          <FilterForm groups={groups} filters={filters} onChange={onChange} onClearAll={onClearAll} />
        </div>
      </aside>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/20"
            aria-label="Close filters"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[88vw] max-w-sm overflow-y-auto border-l border-border bg-background p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">Filters</h2>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <FilterForm
              groups={groups}
              filters={filters}
              onChange={onChange}
              onClearAll={onClearAll}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

