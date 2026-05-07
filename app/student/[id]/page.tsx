import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { FacultySignalBanner } from "@/app/student/[id]/FacultySignalBanner";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { buildMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import { appRouter } from "@/server/routers";
import { createTRPCContext } from "@/server/trpc";

type StudentProfilePageProps = {
  params: Promise<{ id: string }>;
};

const availabilityLabelMap = {
  actively_looking: "Actively Looking",
  open: "Open to It",
  not_available: "Not Available",
} as const;

const availabilityStyleMap = {
  actively_looking:
    "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  open: "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  not_available:
    "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
} as const;

const proficiencyLabelMap: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
};

const collaborationLabelMap: Record<string, string> = {
  research_assistant: "Research Assistant",
  co_author: "Co-author",
  project_lead: "Project Lead",
  independent_project: "Independent Project",
  thesis_collaboration: "Thesis Collaboration",
  casual_mentorship: "Casual Mentorship",
};

function isFacultyRole(role: string | null | undefined) {
  return role === "faculty" || role === "researcher" || role === "coordinator";
}

async function createStudentCaller() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host") ?? "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const cookie = headerStore.get("cookie") ?? "";

  const request = new Request(`${protocol}://${host}/student`, {
    headers: cookie ? { cookie } : undefined,
  });

  const context = await createTRPCContext({
    req: request,
    resHeaders: new Headers(),
  });

  return appRouter.createCaller(context);
}

export async function generateMetadata({ params }: StudentProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  const caller = await createStudentCaller();

  try {
    const profile = await caller.discover.getStudentProfile({ id });
    const degree = profile.degreeType ?? "Student";
    const department = profile.department ?? "University of Maryland";

    return buildMetadata({
      title: profile.displayName,
      description: `${degree} - ${department} - student researcher at UMD`,
      path: `/student/${id}`,
    });
  } catch {
    return buildMetadata({
      title: "Student Profile",
      description: "Student researcher at the University of Maryland.",
      path: `/student/${id}`,
    });
  }
}

export default async function StudentProfilePage({ params }: StudentProfilePageProps) {
  const { id } = await params;
  const caller = await createStudentCaller();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewerRole =
    user?.app_metadata && typeof user.app_metadata === "object" && "role" in user.app_metadata
      ? String((user.app_metadata as Record<string, unknown>).role)
      : null;

  if (user && !viewerRole) {
    const { data: ownProfile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    viewerRole = ownProfile?.role ?? null;
  }

  let profile: Awaited<ReturnType<typeof caller.discover.getStudentProfile>>;
  try {
    profile = await caller.discover.getStudentProfile({ id });
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("not found")) {
      notFound();
    }

    throw error;
  }

  let pendingSignalForFaculty: Awaited<ReturnType<typeof caller.faculty.getSignalForStudent>> | null = null;
  if (user && user.id !== id && isFacultyRole(viewerRole)) {
    try {
      pendingSignalForFaculty = await caller.faculty.getSignalForStudent({ studentId: id });
    } catch {
      pendingSignalForFaculty = null;
    }
  }

  const backHref = isFacultyRole(viewerRole) ? "/dashboard/faculty" : "/dashboard";

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={backHref} className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
        {user?.id === id ? (
          <Link href="/profile/edit" className={cn(buttonVariants({ variant: "default" }), "inline-flex")}>
            Edit Profile
          </Link>
        ) : null}
      </div>

      {pendingSignalForFaculty && pendingSignalForFaculty.status === "pending" ? (
        <FacultySignalBanner signalId={pendingSignalForFaculty.id} createdAt={pendingSignalForFaculty.createdAt} />
      ) : null}

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-3xl">{profile.displayName}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {profile.yearLevel ?? "Year not listed"} - {profile.degreeType ?? "Degree not listed"}
              </p>
              <p className="text-sm text-muted-foreground">{profile.department ?? "Department not listed"}</p>
            </div>
            <Badge className={availabilityStyleMap[profile.availability]}>
              {availabilityLabelMap[profile.availability]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-7">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold tracking-tight">Bio</h2>
            <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
              {profile.bio?.trim() || "No bio provided."}
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Research Interests</h2>
            <div className="flex flex-wrap gap-2">
              {profile.interests.length > 0 ? (
                profile.interests.map((interest) => (
                  <Badge key={`${interest.id}-${interest.name}`} variant={interest.isPrimary ? "default" : "secondary"}>
                    {interest.name}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No interests listed.</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {profile.skills.length > 0 ? (
                profile.skills.map((skill) => (
                  <Badge key={`${skill.id}-${skill.name}`} variant="outline">
                    {skill.name} - {proficiencyLabelMap[skill.proficiencyLevel] ?? skill.proficiencyLevel}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No skills listed.</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Collaboration Preferences</h2>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Experience level: {profile.experienceLevel}</p>
              <p>Availability: {availabilityLabelMap[profile.availability]}</p>
              <p>Hours per week: {profile.hoursPerWeek ?? "Not listed"}</p>
              <p>Start date: {profile.startDateAvailability ?? "Not listed"}</p>
              <p>
                Collaboration types:{" "}
                {profile.preferredCollaborationType.length > 0
                  ? profile.preferredCollaborationType
                      .map((value) => collaborationLabelMap[value] ?? value)
                      .join(", ")
                  : "Not listed"}
              </p>
              <p>{profile.labExperience ? "Has prior lab experience" : "No prior lab experience listed"}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Links</h2>
            <div className="flex flex-col gap-2 text-sm">
              {profile.linkedinUrl ? (
                <Link
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                >
                  LinkedIn
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              ) : null}
              {profile.orcidUrl ? (
                <Link
                  href={profile.orcidUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                >
                  ORCID
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              ) : null}
              {profile.websiteUrl ? (
                <Link
                  href={profile.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                >
                  Website
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              ) : null}
              {profile.githubUrl ? (
                <Link
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                >
                  GitHub
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              ) : null}
              {!profile.linkedinUrl && !profile.orcidUrl && !profile.websiteUrl && !profile.githubUrl ? (
                <p className="text-sm text-muted-foreground">No links listed.</p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
