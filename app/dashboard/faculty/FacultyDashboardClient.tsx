"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StudentCard } from "@/components/shared/cards/StudentCard";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { trpcClient } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

type InterestGroup = {
  category: string;
  interests: Array<{
    id: number;
    name: string;
    category: string;
    parent_id: number | null;
  }>;
};

type SignalStatus = "pending" | "reviewed" | "archived";

type InterestSignalItem = {
  id: string;
  studentId: string;
  studentName: string;
  degreeType: string;
  yearLevel: string;
  topInterests: string[];
  message: string;
  createdAt: string;
  status: SignalStatus;
};

type StudentBrowseItem = {
  id: string;
  displayName: string;
  degreeType: string;
  yearLevel: string;
  department: string;
  availability: "actively_looking" | "open" | "not_available";
  experienceLevel: "beginner" | "intermediate" | "advanced";
  topInterests: string[];
  topSkills: string[];
};

type FacultyDashboardClientProps = {
  initialSignals: InterestSignalItem[];
  initialStudents: StudentBrowseItem[];
  interestGroups: InterestGroup[];
};

const statusLabelMap: Record<SignalStatus, string> = {
  pending: "Pending",
  reviewed: "Reviewed",
  archived: "Archived",
};

const statusStyleMap: Record<SignalStatus, string> = {
  pending: "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  reviewed:
    "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
  archived:
    "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
};

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();

  if (!Number.isFinite(diffMs)) {
    return "just now";
  }

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diffMs < minute) {
    return "just now";
  }

  if (diffMs < hour) {
    const minutes = Math.max(1, Math.floor(diffMs / minute));
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (diffMs < day) {
    const hours = Math.max(1, Math.floor(diffMs / hour));
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  if (diffMs < week) {
    const days = Math.max(1, Math.floor(diffMs / day));
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  const weeks = Math.max(1, Math.floor(diffMs / week));
  return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
}

export function FacultyDashboardClient({
  initialSignals,
  initialStudents,
  interestGroups,
}: FacultyDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"signals" | "students">("signals");
  const [signals, setSignals] = useState(initialSignals);
  const [signalError, setSignalError] = useState<string | null>(null);
  const [updatingSignalId, setUpdatingSignalId] = useState<string | null>(null);

  const [students, setStudents] = useState(initialStudents);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<"" | "beginner" | "intermediate" | "advanced">("");
  const [availability, setAvailability] = useState<"" | "actively_looking" | "open" | "not_available">("");
  const [selectedInterestIds, setSelectedInterestIds] = useState<number[]>([]);

  const flatInterestList = useMemo(
    () => interestGroups.flatMap((group) => group.interests.map((interest) => interest.id)),
    [interestGroups],
  );

  const toggleInterest = (interestId: number) => {
    setSelectedInterestIds((previous) =>
      previous.includes(interestId)
        ? previous.filter((value) => value !== interestId)
        : [...previous, interestId],
    );
  };

  const clearStudentFilters = () => {
    setSearch("");
    setExperienceLevel("");
    setAvailability("");
    setSelectedInterestIds([]);
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void (async () => {
        setStudentsLoading(true);
        setStudentsError(null);

        try {
          const nextStudents = await trpcClient.faculty.browseStudents.query({
            search: search.trim().length > 0 ? search.trim() : undefined,
            interests: selectedInterestIds.length > 0 ? selectedInterestIds : undefined,
            experienceLevel: experienceLevel || undefined,
            availability: availability || undefined,
          });
          setStudents(nextStudents);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Could not load student results.";
          setStudentsError(message);
        } finally {
          setStudentsLoading(false);
        }
      })();
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [availability, experienceLevel, search, selectedInterestIds]);

  const setSignalStatus = async (signalId: string, status: "reviewed" | "archived") => {
    setSignalError(null);
    setUpdatingSignalId(signalId);

    try {
      await trpcClient.faculty.updateSignalStatus.mutate({ signalId, status });
      setSignals((previous) =>
        previous.map((signal) => (signal.id === signalId ? { ...signal, status } : signal)),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update signal status.";
      setSignalError(message);
    } finally {
      setUpdatingSignalId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={activeTab === "signals" ? "default" : "outline"}
          onClick={() => setActiveTab("signals")}
        >
          Interest Signals
        </Button>
        <Button
          type="button"
          variant={activeTab === "students" ? "default" : "outline"}
          onClick={() => setActiveTab("students")}
        >
          Browse Students
        </Button>
      </div>

      {activeTab === "signals" ? (
        <section className="space-y-4">
          <header className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">Interest Signals</h2>
            <p className="text-sm text-muted-foreground">
              Students who reached out to your lab, sorted by newest first.
            </p>
          </header>

          {signalError ? <p className="text-sm text-destructive">{signalError}</p> : null}

          {signals.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-base font-medium">No interest signals yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  No interest signals yet. Make sure your profile shows you&apos;re open to students.
                </p>
              </CardContent>
            </Card>
          ) : (
            signals.map((signal) => (
              <Card key={signal.id}>
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{signal.studentName}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {signal.degreeType} - {signal.yearLevel}
                      </p>
                    </div>
                    <Badge className={statusStyleMap[signal.status]}>{statusLabelMap[signal.status]}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {signal.topInterests.length > 0 ? (
                      signal.topInterests.map((interest) => (
                        <Badge key={interest} variant="secondary">
                          {interest}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No listed interests.</p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="whitespace-pre-line text-sm leading-6 text-foreground/95">
                    {signal.message || "No message provided."}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatTimeAgo(signal.createdAt)}</p>
                </CardContent>
                <CardFooter className="flex flex-wrap justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void setSignalStatus(signal.id, "reviewed");
                      }}
                      disabled={updatingSignalId === signal.id || signal.status === "reviewed"}
                    >
                      Mark Reviewed
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void setSignalStatus(signal.id, "archived");
                      }}
                      disabled={updatingSignalId === signal.id || signal.status === "archived"}
                    >
                      Archive
                    </Button>
                  </div>
                  <Link
                    href={`/student/${signal.studentId}`}
                    className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
                  >
                    View Profile
                  </Link>
                </CardFooter>
              </Card>
            ))
          )}
        </section>
      ) : null}

      {activeTab === "students" ? (
        <section className="space-y-5">
          <header className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">Browse Students</h2>
            <p className="text-sm text-muted-foreground">Search and filter verified student profiles.</p>
          </header>

          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="student-search" className="text-sm font-medium">
                    Search
                  </label>
                  <Input
                    id="student-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Name, department, or keyword"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="student-experience" className="text-sm font-medium">
                    Experience Level
                  </label>
                  <Select
                    id="student-experience"
                    value={experienceLevel}
                    onChange={(event) =>
                      setExperienceLevel(event.target.value as "" | "beginner" | "intermediate" | "advanced")
                    }
                  >
                    <option value="">Any</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="student-availability" className="text-sm font-medium">
                    Availability
                  </label>
                  <Select
                    id="student-availability"
                    value={availability}
                    onChange={(event) =>
                      setAvailability(
                        event.target.value as "" | "actively_looking" | "open" | "not_available",
                      )
                    }
                  >
                    <option value="">Any</option>
                    <option value="actively_looking">Actively Looking</option>
                    <option value="open">Open to It</option>
                    <option value="not_available">Not Available</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Research Interests</p>
                  <Button type="button" variant="ghost" size="sm" onClick={clearStudentFilters}>
                    Clear filters
                  </Button>
                </div>
                <div className="max-h-52 space-y-3 overflow-y-auto rounded-md border border-border/90 bg-card/60 p-3">
                  {interestGroups.map((group) => (
                    <fieldset key={group.category} className="space-y-1.5">
                      <legend className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        {group.category}
                      </legend>
                      <div className="grid gap-1 sm:grid-cols-2 md:grid-cols-3">
                        {group.interests.map((interest) => (
                          <label key={interest.id} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={selectedInterestIds.includes(interest.id)}
                              onChange={() => toggleInterest(interest.id)}
                            />
                            <span>{interest.name}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {studentsLoading ? "Loading students..." : `${students.length} students found`}
            </p>
            {selectedInterestIds.length > 0 || search || experienceLevel || availability ? (
              <p className="text-xs text-muted-foreground">
                {selectedInterestIds.filter((id) => flatInterestList.includes(id)).length} interest filters active
              </p>
            ) : null}
          </div>

          {studentsError ? <p className="text-sm text-destructive">{studentsError}</p> : null}

          {students.length === 0 && !studentsLoading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-base font-medium">No students match your filters.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try removing one or more filters to broaden results.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {students.map((student) => (
                <StudentCard key={student.id} student={student} />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
