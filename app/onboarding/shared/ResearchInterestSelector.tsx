"use client";

import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type InterestItem = {
  id: number;
  name: string;
  category: string;
  parent_id: number | null;
};

export type InterestGroup = {
  category: string;
  interests: InterestItem[];
};

export type InterestSelection = {
  interestId: number;
  isPrimary: boolean;
};

type ResearchInterestSelectorProps = {
  groups: InterestGroup[];
  selected: InterestSelection[];
  query: string;
  onQueryChange: (value: string) => void;
  onToggleInterest: (interestId: number) => void;
  onTogglePrimary: (interestId: number) => void;
  maxSelectable?: number;
  maxPrimary?: number;
  errorMessage?: string;
};

export function ResearchInterestSelector({
  groups,
  selected,
  query,
  onQueryChange,
  onToggleInterest,
  onTogglePrimary,
  maxSelectable = 8,
  maxPrimary = 3,
  errorMessage,
}: ResearchInterestSelectorProps) {
  const selectedIds = new Set(selected.map((item) => item.interestId));
  const selectedPrimaryCount = selected.filter((item) => item.isPrimary).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search interests"
          className="w-full sm:max-w-sm"
        />
        <Badge variant="secondary">
          {selected.length}/{maxSelectable} selected · {selectedPrimaryCount}/{maxPrimary} primary
        </Badge>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.category} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">{group.category}</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.interests.map((interest) => {
                const selectedInterest = selected.find((item) => item.interestId === interest.id);
                const isSelected = selectedIds.has(interest.id);

                return (
                  <div
                    key={interest.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleInterest(interest.id)}
                      className="h-auto flex-1 justify-start px-0"
                    >
                      <span className={isSelected ? "font-semibold text-foreground" : "text-muted-foreground"}>
                        {interest.name}
                      </span>
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={isSelected ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => onToggleInterest(interest.id)}
                        disabled={!isSelected && selected.length >= maxSelectable}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </Button>
                      <Button
                        type="button"
                        variant={selectedInterest?.isPrimary ? "default" : "outline"}
                        size="icon-sm"
                        onClick={() => onTogglePrimary(interest.id)}
                        disabled={!isSelected}
                        aria-label={`Toggle ${interest.name} as primary`}
                      >
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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

