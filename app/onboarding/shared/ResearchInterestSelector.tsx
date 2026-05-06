"use client";

import { useMemo, useState } from "react";
import { Star, X } from "lucide-react";
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
  onCreateCustomInterest?: (name: string) => Promise<InterestItem>;
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
  onCreateCustomInterest,
  maxSelectable = 8,
  maxPrimary = 3,
  errorMessage,
}: ResearchInterestSelectorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const selectedIds = useMemo(() => new Set(selected.map((item) => item.interestId)), [selected]);
  const selectedPrimaryCount = selected.filter((item) => item.isPrimary).length;
  const allInterests = useMemo(() => groups.flatMap((group) => group.interests), [groups]);

  const interestById = useMemo(() => {
    const map = new Map<number, InterestItem>();
    allInterests.forEach((interest) => {
      map.set(interest.id, interest);
    });
    return map;
  }, [allInterests]);

  const normalizedQuery = query.trim().toLowerCase();

  const matchingInterests = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return allInterests
      .filter((interest) => !selectedIds.has(interest.id))
      .filter((interest) => interest.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 8);
  }, [allInterests, normalizedQuery, selectedIds]);

  const canAddMore = selected.length < maxSelectable;
  const visibleErrorMessage = selected.length > 0 ? null : errorMessage;

  const addInterestFromInput = async () => {
    const rawValue = query.replace(/,+$/, "").trim();

    if (!rawValue || !canAddMore) {
      return;
    }

    const existing = allInterests.find((interest) => interest.name.toLowerCase() === rawValue.toLowerCase());

    if (existing) {
      if (!selectedIds.has(existing.id)) {
        onToggleInterest(existing.id);
      }
      onQueryChange("");
      return;
    }

    if (!onCreateCustomInterest) {
      return;
    }

    setIsCreating(true);
    try {
      const customInterest = await onCreateCustomInterest(rawValue);
      if (!selectedIds.has(customInterest.id)) {
        onToggleInterest(customInterest.id);
      }
      onQueryChange("");
    } finally {
      setIsCreating(false);
    }
  };

  const handleQueryKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      void addInterestFromInput();
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
            placeholder="Search interests"
            aria-label="Search and add research interests"
            disabled={isCreating}
          />
          {hasDropdown ? (
            <div className="rounded-md border border-border/90 bg-card shadow-sm">
              {matchingInterests.length > 0 ? (
                <ul className="max-h-56 overflow-y-auto p-1">
                  {matchingInterests.map((interest) => (
                    <li key={interest.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!canAddMore) {
                            return;
                          }
                          onToggleInterest(interest.id);
                          onQueryChange("");
                        }}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                        disabled={!canAddMore}
                      >
                        <span>{interest.name}</span>
                        <span className="text-xs text-muted-foreground">{interest.category}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    void addInterestFromInput();
                  }}
                  className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                  disabled={!canAddMore || !onCreateCustomInterest || isCreating}
                >
                  {isCreating ? "Adding..." : `Add "${query.trim()}" as a custom interest`}
                </button>
              )}
            </div>
          ) : null}
        </div>
        <Badge variant="secondary">
          {selected.length}/{maxSelectable} selected · {selectedPrimaryCount}/{maxPrimary} primary
        </Badge>
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((selection) => {
            const interest = interestById.get(selection.interestId);
            const interestName = interest?.name ?? `Interest #${selection.interestId}`;

            return (
              <div
                key={selection.interestId}
                className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background px-2 py-1"
              >
                <button
                  type="button"
                  onClick={() => onTogglePrimary(selection.interestId)}
                  className="inline-flex items-center gap-1 rounded-full px-1 text-xs"
                >
                  <Star
                    className={
                      selection.isPrimary
                        ? "h-3.5 w-3.5 fill-primary text-primary"
                        : "h-3.5 w-3.5 text-muted-foreground"
                    }
                  />
                  <span className={selection.isPrimary ? "text-primary" : "text-foreground"}>{interestName}</span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="rounded-full"
                  onClick={() => onToggleInterest(selection.interestId)}
                  aria-label={`Remove ${interestName}`}
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
                        disabled={!isSelected && !canAddMore}
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
