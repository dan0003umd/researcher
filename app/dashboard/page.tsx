import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, GraduationCap } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { RecruitingStatusToggle } from "@/app/dashboard/RecruitingStatusToggle";
import { LabCard } from "@/components/shared/cards/LabCard";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { buildMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import { appRouter } from "@/server/routers";
import { createTRPCContext } from "@/server/trpc";

export const metadata: Metadata = buildMetadata({
  title: "Dashboard",
  description: "Manage your Researcher profile and track your research connections.",
  path: "/dashboard",
});

type StudentSignalStatus = "pending" | "reviewed" | "archived";
type UserRole = "student" | "faculty" | "researcher" | "coordinator" | "unverified" | null;

const signalStatusLabelMap: Record<StudentSignalStatus, string> = {
  pending: "Pending",
  reviewed: "Reviewed",
  archived: "Archived",
};

const signalStatusStyleMap: Record<StudentSignalStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  reviewed:
    "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-900/30 dark:text-teal-200",
  archived:
    "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
};

function formatSignalDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isFacultyRole(role: UserRole) {
  return role === "faculty" || role === "researcher" || role === "coordinator";
}

async function createDashboardCaller() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host") ?? "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const cookie = headerStore.get("cookie") ?? "";

  const request = new Request(`${protocol}://${host}/dashboard`, {
    headers: cookie ? { cookie } : undefined,
  });

  const context = await createTRPCContext({
    req: request,
    resHeaders: new Headers(),
  });

  return appRouter.createCaller(context);
}

function ProfileCompletenessCard(props: {
  percentage: number;
  missing: string[];
  setupPath: string;
  editPath: string;
  editLabel: string;
  progressClassName?: string;
}) {
  const isComplete = props.percentage >= 100;

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-xl">Profile Completeness</CardTitle>
          <Link href={props.editPath} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            {props.editLabel}
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">{props.percentage}% complete</p>
        <Progress value={props.percentage} indicatorClassName={props.progressClassName} />
      </CardHeader>
      <CardContent className="space-y-3">
        {isComplete ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Your profile is ready
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">Missing fields</p>
            <ul className="space-y-1 text-sm">
              {props.missing.map((field) => (
                <li key={field}>
                  <Link href={props.setupPath} className="text-primary underline-offset-4 hover:underline">
                    {field}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/dashboard");
  }

  const caller = await createDashboardCaller();
  const data = await caller.dashboard.getDashboardData();

  if (isFacultyRole(data.role)) {
    if (data.mode === "no_profile") {
      redirect("/onboarding/faculty-profile");
    }

    if (data.mode === "faculty") {
      redirect("/dashboard/faculty");
    }
  }

  if (data.mode === "unverified") {
    return (
      <section className="dashboard-surface -mx-6 mx-auto max-w-xl px-6 pb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Complete your verification to get started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Verification confirms your institutional affiliation and helps maintain a trusted academic network.
            </p>
            <Link href="/onboarding/verify-email" className={buttonVariants()}>
              Continue Verification
            </Link>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (data.mode === "no_profile") {
    const setupPath =
      data.profileSetupPath ??
      (data.role === "student" ? "/onboarding/profile" : "/onboarding/faculty-profile");

    return (
      <section className="dashboard-surface -mx-6 mx-auto max-w-xl px-6 pb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Set up your profile to get started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your profile powers better matches and helps others understand your research interests.
            </p>
            <Link href={setupPath} className={buttonVariants()}>
              Set Up Profile
            </Link>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (data.mode === "student") {
    const degreeLabel = data.student.summary.degreeType ?? "Degree";
    const departmentLabel = data.student.summary.department ?? "Department";

    return (
      <section className="dashboard-surface -mx-6 space-y-6 px-6 pb-6">
        <header className="-mx-6 rounded-b-2xl bg-[linear-gradient(135deg,var(--color-primary)_0%,oklch(from_var(--color-primary)_calc(l_-_0.08)_c_h)_100%)] px-8 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="font-[var(--font-display)] text-2xl font-normal text-white">Student Dashboard</h1>
              <p className="text-[0.875rem] text-white/80">
                {data.displayName} · {degreeLabel} · {departmentLabel}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/80 px-3 py-1 text-xs font-semibold text-white">
              <GraduationCap className="h-3.5 w-3.5" />
              Student
            </span>
          </div>
        </header>

        <ProfileCompletenessCard
          percentage={data.profileCompleteness.percentage}
          missing={data.profileCompleteness.missing}
          setupPath="/onboarding/profile"
          editPath="/profile/edit"
          editLabel="Edit Profile"
          progressClassName="bg-primary"
        />

        <Card>
          <CardHeader className="flex flex-row items-end justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Labs matching your interests</CardTitle>
              <p className="text-sm text-muted-foreground">Recommended labs based on your current interest profile.</p>
            </div>
            <Link href="/discover" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Browse all labs
            </Link>
          </CardHeader>
          <CardContent>
            {data.student.matchedLabs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add research interests to your profile to get personalized lab matches.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.student.matchedLabs.map((lab) => (
                  <LabCard key={lab.id} lab={lab} canExpressInterest />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-xl">Your Interest Signals</CardTitle>
              <Link
                href="/dashboard/signals"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                View all signals
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">Labs you have already contacted.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.student.sentSignals.length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  You haven&apos;t expressed interest in any labs yet.
                </p>
                <Link href="/discover" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                  Discover labs
                </Link>
              </div>
            ) : (
              data.student.sentSignals.map((signal) => (
                <div
                  key={signal.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/90 bg-[var(--color-surface)] p-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{signal.labName}</p>
                    <p className="text-xs text-muted-foreground">Sent {formatSignalDate(signal.sentAt)}</p>
                  </div>
                  <Badge className={signalStatusStyleMap[signal.status]}>
                    {signalStatusLabelMap[signal.status]}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div>
          <Link href="/discover" className={buttonVariants()}>
            Browse Labs
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-surface -mx-6 space-y-6 px-6 pb-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">Dashboard</p>
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back, {data.displayName}</h1>
      </header>

      <RecruitingStatusToggle
        initialRecruiting={data.faculty.currentlyRecruiting}
        recruitingMessage={data.faculty.recruitingMessage}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-xl">Interest Signals</CardTitle>
            <p className="text-sm text-muted-foreground">
              {data.faculty.pendingSignalCount} pending signal
              {data.faculty.pendingSignalCount === 1 ? "" : "s"}
            </p>
          </div>
          <Link href="/dashboard/faculty" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            View all signals
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.faculty.latestSignals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No student signals yet.</p>
          ) : (
            data.faculty.latestSignals.map((signal) => (
              <div key={signal.id} className="rounded-lg border border-border/90 p-3">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <p className="font-medium">{signal.studentName}</p>
                  <Badge className={signalStatusStyleMap[signal.status]}>
                    {signalStatusLabelMap[signal.status]}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {signal.message || "No message provided."}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <ProfileCompletenessCard
        percentage={data.profileCompleteness.percentage}
        missing={data.profileCompleteness.missing}
        setupPath="/onboarding/faculty-profile"
        editPath="/profile/faculty/edit"
        editLabel="Edit Lab Profile"
      />

      <div>
        <Link href="/dashboard/faculty" className={cn(buttonVariants())}>
          View all signals
        </Link>
      </div>
    </section>
  );
}
