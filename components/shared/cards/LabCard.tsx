import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export type LabCardInterest = {
  id: number;
  name: string;
  category: string;
  isPrimary: boolean;
};

export type LabCardData = {
  id: string;
  piName: string;
  labName: string | null;
  department: string | null;
  bio: string | null;
  recruitingMessage: string | null;
  currentlyRecruiting: boolean;
  experienceLevelSought: "any" | "beginner" | "intermediate" | "advanced";
  interests: LabCardInterest[];
  desiredSkills: Array<{
    id: number;
    name: string;
    category: string;
    proficiencyLevel: "beginner" | "intermediate" | "advanced" | "expert";
  }>;
  verified: boolean;
};

type LabCardProps = {
  lab: LabCardData;
  canExpressInterest?: boolean;
  highlightQuery?: string;
};

const maxVisibleInterests = 4;
const maxBioLength = 120;

const experienceLevelLabel: Record<LabCardData["experienceLevelSought"], string> = {
  any: "Any experience",
  beginner: "Beginner friendly",
  intermediate: "Intermediate preferred",
  advanced: "Advanced preferred",
};

function getBioExcerpt(value: string | null) {
  if (!value) {
    return "No lab overview has been added yet.";
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxBioLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxBioLength - 3).trimEnd()}...`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderHighlightedText(value: string, query: string) {
  const tokens = Array.from(new Set(query.toLowerCase().split(/\s+/).filter(Boolean)));

  if (!value || tokens.length === 0) {
    return value;
  }

  const matcher = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "ig");
  const parts = value.split(matcher);

  return parts.map((part, index) => {
    const shouldHighlight = tokens.some((token) => part.toLowerCase() === token);
    return shouldHighlight ? <mark key={`${part}-${index}`}>{part}</mark> : part;
  });
}

export function LabCard({ lab, canExpressInterest = false, highlightQuery = "" }: LabCardProps) {
  const visibleInterests = lab.interests.slice(0, maxVisibleInterests);
  const hiddenInterestCount = Math.max(lab.interests.length - maxVisibleInterests, 0);
  const normalizedQuery = highlightQuery.trim();

  return (
    <article className="h-full">
      <Link href={`/lab/${lab.id}`} className="block h-full" aria-label={`View ${lab.piName}'s lab`}>
        <Card className="h-full min-h-[280px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg leading-tight">{renderHighlightedText(lab.piName, normalizedQuery)}</CardTitle>
              {lab.verified ? (
                <Badge className="border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  UMD Verified
                </Badge>
              ) : null}
              {lab.currentlyRecruiting ? (
                <Badge className="border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                  Open to students
                </Badge>
              ) : null}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground/95">
                {renderHighlightedText(lab.labName?.trim() || "Research Lab", normalizedQuery)}
              </p>
              <p className="text-sm text-muted-foreground">
                {renderHighlightedText(lab.department?.trim() || "Department not listed", normalizedQuery)}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex min-h-8 flex-wrap gap-1.5">
              {visibleInterests.map((interest) => (
                <Badge key={interest.id} variant={interest.isPrimary ? "default" : "secondary"}>
                  {interest.name}
                </Badge>
              ))}
              {hiddenInterestCount > 0 ? <Badge variant="outline">+{hiddenInterestCount} more</Badge> : null}
              {lab.interests.length === 0 ? (
                <p className="text-xs text-muted-foreground">No interests listed yet</p>
              ) : null}
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{getBioExcerpt(lab.bio)}</p>
          </CardContent>
          <CardFooter className="mt-auto items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {experienceLevelLabel[lab.experienceLevelSought]}
            </p>
            {canExpressInterest ? <Badge variant="outline">Express Interest</Badge> : null}
          </CardFooter>
        </Card>
      </Link>
    </article>
  );
}

export function LabCardSkeleton() {
  return (
    <Card className="h-full min-h-[280px] animate-pulse">
      <CardHeader className="space-y-3">
        <div className="h-5 w-44 rounded bg-muted" />
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="space-y-2">
          <div className="h-4 w-36 rounded bg-muted" />
          <div className="h-4 w-28 rounded bg-muted" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="h-6 w-20 rounded-full bg-muted" />
          <div className="h-6 w-24 rounded-full bg-muted" />
          <div className="h-6 w-16 rounded-full bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-[92%] rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
        </div>
      </CardContent>
      <CardFooter className="mt-auto items-center justify-between">
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="h-6 w-24 rounded-full bg-muted" />
      </CardFooter>
    </Card>
  );
}
