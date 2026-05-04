import Link from "next/link";
import { headers } from "next/headers";
import { DiscoverFilters } from "@/app/discover/DiscoverFilters";
import { LabCard } from "@/components/shared/cards/LabCard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { appRouter } from "@/server/routers";
import { createTRPCContext } from "@/server/trpc";

type DiscoverPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ExperienceLevelFilter = "" | "any" | "beginner" | "intermediate" | "advanced";

type DiscoverFilterState = {
  interests: string[];
  department: string;
  recruiting: boolean;
  experienceLevel: ExperienceLevelFilter;
};

function toArray(value: string | string[] | undefined) {
  if (!value) {
    return [] as string[];
  }

  return Array.isArray(value) ? value : [value];
}

function parseInterestFilters(params: Record<string, string | string[] | undefined>) {
  const values = [...toArray(params.interest), ...toArray(params.interests)];
  const deduped = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

  return deduped;
}

function parseRecruitingFilter(value: string | string[] | undefined) {
  const input = Array.isArray(value) ? value[0] : value;

  return input === "true" || input === "1" || input === "on";
}

function parseExperienceLevelFilter(value: string | string[] | undefined): ExperienceLevelFilter {
  const input = (Array.isArray(value) ? value[0] : value)?.trim();

  if (!input) {
    return "";
  }

  if (input === "any" || input === "beginner" || input === "intermediate" || input === "advanced") {
    return input;
  }

  return "";
}

function parseDiscoverFilters(params: Record<string, string | string[] | undefined>): DiscoverFilterState {
  const departmentInput = Array.isArray(params.department) ? params.department[0] : params.department;

  return {
    interests: parseInterestFilters(params),
    department: (departmentInput ?? "").trim(),
    recruiting: parseRecruitingFilter(params.recruiting),
    experienceLevel: parseExperienceLevelFilter(params.experienceLevel),
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

async function createDiscoverCaller() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host") ?? "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const cookie = headerStore.get("cookie") ?? "";

  const request = new Request(`${protocol}://${host}/discover`, {
    headers: cookie ? { cookie } : undefined,
  });

  const context = await createTRPCContext({
    req: request,
    resHeaders: new Headers(),
  });

  return appRouter.createCaller(context);
}

function resolveExpressInterestAccess(user: {
  app_metadata?: Record<string, unknown>;
} | null) {
  if (!user || !user.app_metadata || typeof user.app_metadata !== "object") {
    return false;
  }

  const verified =
    "institutional_verified" in user.app_metadata && Boolean(user.app_metadata.institutional_verified);
  const role = "role" in user.app_metadata ? String(user.app_metadata.role) : "";

  return verified && role === "student";
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parseDiscoverFilters(resolvedSearchParams);
  const caller = await createDiscoverCaller();
  const shouldSearch = hasActiveFilters(filters);

  const [filterGroups, labsResponse, user] = await Promise.all([
    caller.discover.getResearchInterestFilters(),
    shouldSearch
      ? caller.discover.searchLabs({
          interests: filters.interests,
          department: filters.department || undefined,
          recruiting: filters.recruiting ? true : undefined,
          experienceLevel: filters.experienceLevel || undefined,
        })
      : caller.discover.getFeaturedLabs(),
    (async () => {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      return user;
    })(),
  ]);

  const labs = labsResponse.labs;
  const canExpressInterest = resolveExpressInterestAccess(
    user ? { app_metadata: user.app_metadata as Record<string, unknown> } : null,
  );

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">Discover</p>
        <h1 className="text-3xl font-semibold tracking-tight">Browse UMD Labs and Faculty</h1>
        <p className="text-sm text-muted-foreground">
          {labsResponse.total} labs found
          {!shouldSearch ? " · Featured for first-time browsing" : ""}
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[300px_minmax(0,1fr)]">
        <DiscoverFilters groups={filterGroups} currentFilters={filters} />

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{labsResponse.total} labs found</p>

          {labs.length === 0 ? (
            <div className="rounded-xl border border-border/90 bg-card p-8 text-center shadow-sm">
              <h2 className="text-xl font-semibold tracking-tight">No labs match your filters yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Try removing some filters or check back as more labs join
              </p>
              <Link
                href="/discover"
                className={cn(buttonVariants({ variant: "outline" }), "mt-5")}
              >
                Clear all filters
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {labs.map((lab) => (
                <LabCard key={lab.id} lab={lab} canExpressInterest={canExpressInterest} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

