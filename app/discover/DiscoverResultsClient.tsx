"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SearchX, X } from "lucide-react";
import { DiscoverFilters, type DiscoverFilterState, type InterestGroup } from "@/app/discover/DiscoverFilters";
import { LabCard, type LabCardData } from "@/components/shared/cards/LabCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DiscoverResultsClientProps = {
  groups: InterestGroup[];
  initialFilters: DiscoverFilterState;
  initialQuery: string;
  labs: LabCardData[];
  canExpressInterest: boolean;
};

function normalizeSearchValue(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseInterestFilters(params: URLSearchParams) {
  const values = [...params.getAll("interest"), ...params.getAll("interests")];
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function parseRecruitingFilter(params: URLSearchParams) {
  const value = params.get("recruiting");
  return value === "true" || value === "1" || value === "on";
}

function parseExperienceLevelFilter(params: URLSearchParams): DiscoverFilterState["experienceLevel"] {
  const value = params.get("experienceLevel")?.trim();
  if (!value) {
    return "";
  }
  if (value === "any" || value === "beginner" || value === "intermediate" || value === "advanced") {
    return value;
  }
  return "";
}

function parseQueryFromParams(params: URLSearchParams) {
  return params.get("q")?.trim() ?? "";
}

function parseFiltersFromParams(params: URLSearchParams): DiscoverFilterState {
  return {
    interests: parseInterestFilters(params),
    department: params.get("department")?.trim() ?? "",
    recruiting: parseRecruitingFilter(params),
    experienceLevel: parseExperienceLevelFilter(params),
  };
}

function hasActiveFilters(filters: DiscoverFilterState) {
  return (
    filters.interests.length > 0 ||
    filters.department.length > 0 ||
    filters.recruiting ||
    filters.experienceLevel.length > 0
  );
}

function areFilterStatesEqual(left: DiscoverFilterState, right: DiscoverFilterState) {
  if (
    left.department !== right.department ||
    left.recruiting !== right.recruiting ||
    left.experienceLevel !== right.experienceLevel ||
    left.interests.length !== right.interests.length
  ) {
    return false;
  }

  const leftSorted = [...left.interests].sort();
  const rightSorted = [...right.interests].sort();

  return leftSorted.every((value, index) => value === rightSorted[index]);
}

function buildSearchParams(filters: DiscoverFilterState, query: string) {
  const params = new URLSearchParams();

  const cleanQuery = query.trim();
  if (cleanQuery.length > 0) {
    params.set("q", cleanQuery);
  }

  if (filters.department.trim().length > 0) {
    params.set("department", filters.department.trim());
  }

  if (filters.recruiting) {
    params.set("recruiting", "true");
  }

  if (filters.experienceLevel.length > 0) {
    params.set("experienceLevel", filters.experienceLevel);
  }

  [...filters.interests]
    .sort((a, b) => Number(a) - Number(b))
    .forEach((interestId) => {
      params.append("interest", interestId);
    });

  return params;
}

function matchesSearch(lab: LabCardData, query: string) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    return true;
  }

  const tokens = normalizedQuery.split(" ").filter(Boolean);
  if (tokens.length === 0) {
    return true;
  }

  const searchableValues = [
    lab.labName ?? "",
    lab.piName ?? "",
    lab.department ?? "",
    lab.interests.map((interest) => interest.name).join(" "),
    lab.recruitingMessage ?? "",
    lab.desiredSkills.map((skill) => skill.name).join(" "),
    lab.bio ?? "",
  ];

  const haystack = normalizeSearchValue(searchableValues.join(" "));
  return tokens.every((token) => haystack.includes(token));
}

function matchesFilters(lab: LabCardData, filters: DiscoverFilterState) {
  if (filters.recruiting && !lab.currentlyRecruiting) {
    return false;
  }

  if (filters.experienceLevel && filters.experienceLevel !== "any" && lab.experienceLevelSought !== filters.experienceLevel) {
    return false;
  }

  if (filters.department.trim().length > 0) {
    const term = normalizeSearchValue(filters.department);
    const department = normalizeSearchValue(lab.department ?? "");
    if (!department.includes(term)) {
      return false;
    }
  }

  if (filters.interests.length > 0) {
    const selected = new Set(filters.interests);
    const hasMatchingInterest = lab.interests.some((interest) => selected.has(String(interest.id)));
    if (!hasMatchingInterest) {
      return false;
    }
  }

  return true;
}

export function DiscoverResultsClient({
  groups,
  initialFilters,
  initialQuery,
  labs,
  canExpressInterest,
}: DiscoverResultsClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<DiscoverFilterState>(initialFilters);
  const [queryInput, setQueryInput] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(queryInput);
    }, 200);

    return () => window.clearTimeout(timeoutId);
  }, [queryInput]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const nextQuery = parseQueryFromParams(params);
    const nextFilters = parseFiltersFromParams(params);

    setQueryInput((previous) => (previous === nextQuery ? previous : nextQuery));
    setDebouncedQuery((previous) => (previous === nextQuery ? previous : nextQuery));
    setFilters((previous) => (areFilterStatesEqual(previous, nextFilters) ? previous : nextFilters));
  }, [searchParams]);

  useEffect(() => {
    const nextParams = buildSearchParams(filters, debouncedQuery);
    const next = nextParams.toString();
    const current = searchParams.toString();

    if (next === current) {
      return;
    }

    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [debouncedQuery, filters, pathname, router, searchParams]);

  const filteredLabs = useMemo(
    () => labs.filter((lab) => matchesFilters(lab, filters) && matchesSearch(lab, debouncedQuery)),
    [debouncedQuery, filters, labs],
  );

  const isSearching = debouncedQuery.trim().length > 0;
  const hasFilters = hasActiveFilters(filters);

  const searchSummary = useMemo(() => {
    const count = filteredLabs.length;
    const trimmedQuery = debouncedQuery.trim();
    const filtersSummary: string[] = [];

    if (filters.department.trim()) {
      filtersSummary.push(filters.department.trim());
    }
    if (filters.recruiting) {
      filtersSummary.push("recruiting only");
    }
    if (filters.experienceLevel) {
      filtersSummary.push(`experience: ${filters.experienceLevel}`);
    }

    if (!isSearching && !hasFilters) {
      return `Showing all ${count} labs`;
    }

    if (isSearching && filtersSummary.length > 0) {
      return `${count} labs match "${trimmedQuery}" in ${filtersSummary.join(" · ")}`;
    }

    if (isSearching) {
      return `${count} labs match "${trimmedQuery}"`;
    }

    return `Showing ${count} labs`;
  }, [debouncedQuery, filteredLabs.length, filters.department, filters.experienceLevel, filters.recruiting, hasFilters, isSearching]);

  const clearSearch = () => {
    setQueryInput("");
    setDebouncedQuery("");
  };

  const clearAllFilters = () => {
    setQueryInput("");
    setDebouncedQuery("");
    setFilters({
      interests: [],
      department: "",
      recruiting: false,
      experienceLevel: "",
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-[300px_minmax(0,1fr)]">
      <DiscoverFilters groups={groups} filters={filters} onChange={setFilters} onClearAll={clearAllFilters} />

      <div className="space-y-4">
        <div className="mx-auto w-full max-w-3xl space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Search labs, topics, or faculty..."
              className="h-11 pl-10 pr-10"
            />
            {queryInput.trim().length > 0 ? (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 sm:hidden">
            {filters.recruiting ? (
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                Recruiting only
              </span>
            ) : null}
            {filters.department.trim() ? (
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                {filters.department.trim()}
              </span>
            ) : null}
            {filters.experienceLevel ? (
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                {filters.experienceLevel}
              </span>
            ) : null}
            {filters.interests.length > 0 ? (
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                {filters.interests.length} interests
              </span>
            ) : null}
          </div>
        </div>

        {filteredLabs.length > 0 ? (
          <p className="text-sm text-muted-foreground">{searchSummary}</p>
        ) : null}

        {filteredLabs.length === 0 ? (
          <div className="rounded-xl border border-border/90 bg-card p-8 text-center shadow-sm">
            <SearchX className="mx-auto h-9 w-9 text-muted-foreground" />
            <h2 className="mt-3 text-xl font-semibold tracking-tight">No labs found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              No labs match &quot;{debouncedQuery.trim() || "your current search"}&quot;. Try different keywords or clear your filters.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={clearSearch}>
                Clear search
              </Button>
              <Button type="button" variant="outline" onClick={clearAllFilters}>
                Clear all filters
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredLabs.map((lab) => (
              <LabCard
                key={lab.id}
                lab={lab}
                canExpressInterest={canExpressInterest}
                highlightQuery={debouncedQuery}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
