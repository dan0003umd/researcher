import type { Metadata } from "next";
import { headers } from "next/headers";
import { DiscoverResultsClient } from "@/app/discover/DiscoverResultsClient";
import { type DiscoverFilterState } from "@/app/discover/DiscoverFilters";
import { buildMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import { appRouter } from "@/server/routers";
import { createTRPCContext } from "@/server/trpc";

type DiscoverPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = buildMetadata({
  title: "Discover Labs",
  description:
    "Browse research labs at the University of Maryland. Filter by department, research area, and recruiting status.",
  path: "/discover",
});

function toArray(value: string | string[] | undefined) {
  if (!value) {
    return [] as string[];
  }

  return Array.isArray(value) ? value : [value];
}

function parseInterestFilters(params: Record<string, string | string[] | undefined>) {
  const values = [...toArray(params.interest), ...toArray(params.interests)];
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function parseRecruitingFilter(value: string | string[] | undefined) {
  const input = Array.isArray(value) ? value[0] : value;
  return input === "true" || input === "1" || input === "on";
}

function parseExperienceLevelFilter(value: string | string[] | undefined): DiscoverFilterState["experienceLevel"] {
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

function parseSearchQuery(params: Record<string, string | string[] | undefined>) {
  const query = Array.isArray(params.q) ? params.q[0] : params.q;
  return (query ?? "").trim();
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
  const query = parseSearchQuery(resolvedSearchParams);
  const caller = await createDiscoverCaller();

  const [filterGroups, labsResponse, user] = await Promise.all([
    caller.discover.getResearchInterestFilters(),
    caller.discover.searchLabs({}),
    (async () => {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      return user;
    })(),
  ]);

  const canExpressInterest = resolveExpressInterestAccess(
    user ? { app_metadata: user.app_metadata as Record<string, unknown> } : null,
  );

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">Discover</p>
        <h1 className="text-3xl font-semibold tracking-tight">Browse UMD Labs and Faculty</h1>
        <p className="text-sm text-muted-foreground">{labsResponse.total} labs available to browse</p>
      </header>

      <DiscoverResultsClient
        groups={filterGroups}
        initialFilters={filters}
        initialQuery={query}
        labs={labsResponse.labs}
        canExpressInterest={canExpressInterest}
      />
    </section>
  );
}
