import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ExpressInterestSheet } from "@/app/lab/[id]/ExpressInterestSheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import { appRouter } from "@/server/routers";
import { createTRPCContext } from "@/server/trpc";

type LabPageProps = {
  params: Promise<{ id: string }>;
};

type AppMetadata = {
  institutional_verified?: boolean;
  role?: string;
};

const experienceLevelLabel = {
  any: "Any experience",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
} as const;

function resolveInitials(name: string) {
  const segments = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (segments.length === 0) {
    return "L";
  }

  if (segments.length === 1) {
    return segments[0].slice(0, 2).toUpperCase();
  }

  return `${segments[0][0]}${segments[1][0]}`.toUpperCase();
}

function canStudentExpressInterest(metadata: AppMetadata | null) {
  if (!metadata) {
    return false;
  }

  return Boolean(metadata.institutional_verified) && metadata.role === "student";
}

async function createLabCaller() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host") ?? "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const cookie = headerStore.get("cookie") ?? "";

  const request = new Request(`${protocol}://${host}/lab`, {
    headers: cookie ? { cookie } : undefined,
  });

  const context = await createTRPCContext({
    req: request,
    resHeaders: new Headers(),
  });

  return appRouter.createCaller(context);
}

export async function generateMetadata({ params }: LabPageProps): Promise<Metadata> {
  const { id } = await params;
  const caller = await createLabCaller();

  try {
    const labProfile = await caller.discover.getLabProfile({ id });
    const labTitle = labProfile.labName?.trim() || `${labProfile.piName}'s Lab`;
    const department = labProfile.department?.trim() || "University of Maryland";

    return buildMetadata({
      title: labTitle,
      description: `${labProfile.piName} - ${department} - research lab at the University of Maryland`,
      path: `/lab/${id}`,
    });
  } catch {
    return buildMetadata({
      title: "Lab Profile",
      description: "Research lab at the University of Maryland.",
      path: `/lab/${id}`,
    });
  }
}

export default async function LabProfilePage({ params }: LabPageProps) {
  const { id } = await params;
  const caller = await createLabCaller();

  let labProfile: Awaited<ReturnType<typeof caller.discover.getLabProfile>>;

  try {
    labProfile = await caller.discover.getLabProfile({ id });
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("not found")) {
      notFound();
    }

    throw error;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const metadata = user?.app_metadata as AppMetadata | undefined;
  const canExpressInterest = canStudentExpressInterest(metadata ?? null);
  const isLabOwner = user?.id === labProfile.id;

  const [alreadySent, studentSummary] = canExpressInterest
    ? await Promise.all([
        caller.discover.hasExpressedInterest({ facultyId: labProfile.id }),
        caller.discover.getMySignalSummary(),
      ])
    : [false, null];

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader className="space-y-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14 text-base">
                <AvatarFallback>{resolveInitials(labProfile.piName)}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-2xl">{labProfile.piName}</CardTitle>
                  {labProfile.verified ? (
                    <Badge className="border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      UMD Verified
                    </Badge>
                  ) : null}
                </div>
                <p className="text-base font-medium text-foreground/90">{labProfile.labName || "Research Lab"}</p>
                <p className="text-sm text-muted-foreground">{labProfile.department || "Department not listed"}</p>
                {labProfile.labUrl ? (
                  <Link
                    href={labProfile.labUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
                  >
                    Lab website
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {isLabOwner ? (
                <Link href="/profile/faculty/edit" className={buttonVariants({ variant: "outline" })}>
                  Edit Lab Profile
                </Link>
              ) : null}
              {canExpressInterest ? (
                alreadySent ? (
                  <Button type="button" disabled>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Interest sent
                  </Button>
                ) : studentSummary ? (
                  <ExpressInterestSheet
                    facultyId={labProfile.id}
                    facultyName={labProfile.piName}
                    studentSummary={studentSummary}
                  />
                ) : null
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">About this lab</h2>
            <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
              {labProfile.bio?.trim() || "No bio has been added yet."}
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Research Interests</h2>
            <div className="flex flex-wrap gap-2">
              {labProfile.interests.length > 0 ? (
                labProfile.interests.map((interest) => (
                  <Badge key={`${interest.id}-${interest.name}`} variant={interest.isPrimary ? "default" : "secondary"}>
                    {interest.name}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No research interests listed yet.</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight">Currently Seeking</h2>
            <div className="grid gap-4 rounded-lg border border-border/90 bg-card/60 p-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Experience level sought
                </p>
                <p className="text-sm font-medium text-foreground">
                  {experienceLevelLabel[labProfile.experienceLevelSought]}
                </p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Skills wanted</p>
                <div className="flex flex-wrap gap-2">
                  {labProfile.desiredSkills.length > 0 ? (
                    labProfile.desiredSkills.map((skill) => (
                      <Badge key={`${skill.id}-${skill.name}`} variant="secondary">
                        {skill.name}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No preferred skills listed yet.</p>
                  )}
                </div>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Recruiting message
                </p>
                <p className="text-sm leading-7 text-muted-foreground">
                  {labProfile.recruitingMessage?.trim() || "No recruiting message provided."}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
