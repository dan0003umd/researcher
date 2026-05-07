"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

export const RESEARCH_INTERESTS = [
  "Machine Learning",
  "Deep Learning",
  "Natural Language Processing",
  "Computer Vision",
  "Robotics",
  "Human-Computer Interaction",
  "Cybersecurity",
  "Distributed Systems",
  "Database Systems",
  "Algorithms & Theory",
  "Bioinformatics",
  "Computational Biology",
  "Neuroscience",
  "Cognitive Science",
  "Data Science",
  "Reinforcement Learning",
  "Generative AI",
  "AI Ethics & Fairness",
  "Software Engineering",
  "Programming Languages",
  "Operating Systems",
  "Computer Networks",
  "Cloud Computing",
  "Edge Computing",
  "Quantum Computing",
  "High Performance Computing",
  "Computer Graphics",
  "Virtual Reality",
  "Augmented Reality",
  "Social Computing",
  "Information Retrieval",
  "Knowledge Graphs",
  "Multi-Agent Systems",
  "Formal Verification",
  "Compilers",
  "Embedded Systems",
  "Signal Processing",
  "Medical Imaging",
  "Climate Informatics",
  "Economics & Computation",
];

type ResearchInterestSelectorProps = {
  value: string[];
  onChange: (value: string[]) => void;
  primaryInterests: string[];
  onPrimaryChange: (value: string[]) => void;
  maxSelections?: number;
  maxPrimary?: number;
  errorMessage?: string;
};

const normalize = (value: string) => value.trim().toLowerCase();

export function ResearchInterestSelector({
  value,
  onChange,
  primaryInterests,
  onPrimaryChange,
  maxSelections = 8,
  maxPrimary = 3,
  errorMessage,
}: ResearchInterestSelectorProps) {
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

    return RESEARCH_INTERESTS.filter((item) => !normalizedSelected.has(normalize(item)))
      .filter((item) => normalize(item).includes(normalizedQuery))
      .slice(0, 8);
  }, [query, normalizedSelected]);

  const hasExactMatch = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) {
      return false;
    }

    return RESEARCH_INTERESTS.some((item) => normalize(item) === normalizedQuery);
  }, [query]);

  const addInterest = (raw: string) => {
    const nextValue = raw.trim();
    if (!nextValue || !canAddMore) {
      return;
    }

    if (normalizedSelected.has(normalize(nextValue))) {
      setQuery("");
      setIsOpen(false);
      return;
    }

    const nextSelected = [...value, nextValue];
    onChange(nextSelected);

    const nextPrimary = primaryInterests.filter((item) =>
      nextSelected.some((selected) => normalize(selected) === normalize(item)),
    );

    if (
      nextPrimary.length < maxPrimary &&
      !nextPrimary.some((item) => normalize(item) === normalize(nextValue))
    ) {
      nextPrimary.push(nextValue);
      onPrimaryChange(nextPrimary);
    } else {
      onPrimaryChange(nextPrimary);
    }

    setQuery("");
    setIsOpen(false);
  };

  const removeInterest = (interest: string) => {
    const nextSelected = value.filter((item) => normalize(item) !== normalize(interest));
    const nextPrimary = primaryInterests.filter((item) => normalize(item) !== normalize(interest));
    onChange(nextSelected);
    onPrimaryChange(nextPrimary);
  };

  const togglePrimary = (interest: string) => {
    const exists = primaryInterests.some((item) => normalize(item) === normalize(interest));

    if (exists) {
      onPrimaryChange(primaryInterests.filter((item) => normalize(item) !== normalize(interest)));
      return;
    }

    const cleaned = primaryInterests.filter((item) =>
      value.some((selected) => normalize(selected) === normalize(item)),
    );

    if (cleaned.length < maxPrimary) {
      onPrimaryChange([...cleaned, interest]);
      return;
    }

    onPrimaryChange([...cleaned.slice(1), interest]);
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
        <p className="text-xs text-muted-foreground">
          {value.length}/{maxSelections} selected · {primaryInterests.length}/{maxPrimary} primary
        </p>
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

            if (event.key === "Enter") {
              event.preventDefault();
              if (filteredOptions.length > 0) {
                addInterest(filteredOptions[0]);
              } else if (query.trim().length > 0) {
                addInterest(query);
              }
            }
          }}
          placeholder="Search interests..."
          disabled={!canAddMore}
          title={!canAddMore ? `Maximum ${maxSelections} interests selected` : undefined}
          className="w-full border-border/80 focus-visible:ring-primary"
        />

        {showDropdown ? (
          <div className="absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-background shadow-md">
            {filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-primary/10"
                onClick={() => addInterest(option)}
              >
                {option}
              </button>
            ))}
            {showCustomAdd ? (
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-primary hover:bg-primary/10"
                onClick={() => addInterest(query)}
              >
                + Add &quot;{query.trim()}&quot;
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {value.map((interest) => {
          const isPrimary = primaryInterests.some((item) => normalize(item) === normalize(interest));
          return (
            <div
              key={interest}
              className={
                isPrimary
                  ? "inline-flex items-center gap-1 rounded-full border border-primary bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                  : "inline-flex items-center gap-1 rounded-full border border-primary bg-background px-3 py-1 text-xs font-medium text-primary"
              }
            >
              <button type="button" onClick={() => togglePrimary(interest)} className="truncate">
                {interest}
              </button>
              <button
                type="button"
                onClick={() => removeInterest(interest)}
                aria-label={`Remove ${interest}`}
                className="rounded-full p-0.5"
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
