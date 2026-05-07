"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { trpcClient } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

type SignalStatus = "pending" | "reviewed" | "archived";

type InterestSignalItem = {
  id: string;
  studentId: string;
  studentName: string;
  degreeType: string;
  yearLevel: string;
  department: string;
  topInterests: string[];
  topSkills: string[];
  message: string;
  createdAt: string;
  reviewedAt: string | null;
  status: SignalStatus;
};

type LabSummary = {
  facultyId: string;
  labName: string | null;
  department: string | null;
  currentlyRecruiting: boolean;
  recruitingMessage: string;
  totalSignals: number;
  pendingSignals: number;
  reviewedSignals: number;
  archivedSignals: number;
};

type FacultyDashboardClientProps = {
  labSummary: LabSummary;
  initialSignals: InterestSignalItem[];
};

const statusTabs = ["pending", "all", "reviewed", "archived"] as const;
type StatusTab = (typeof statusTabs)[number];

const statusTabLabelMap: Record<StatusTab, string> = {
  all: "All",
  pending: "Pending",
  reviewed: "Reviewed",
  archived: "Archived",
};

const statusLabelMap: Record<SignalStatus, string> = {
  pending: "Pending",
  reviewed: "Reviewed",
  archived: "Archived",
};

const statusStyleMap: Record<SignalStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200",
  reviewed:
    "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200",
  archived:
    "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
};

function formatDate(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string) {
  const segments = name.trim().split(/\s+/).filter(Boolean);
  if (segments.length === 0) {
    return "S";
  }
  if (segments.length === 1) {
    return segments[0].slice(0, 2).toUpperCase();
  }
  return `${segments[0][0]}${segments[1][0]}`.toUpperCase();
}

function dispatchPendingCountDelta(delta: number) {
  if (typeof window === "undefined" || delta === 0) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("faculty-pending-signals-change", {
      detail: { delta },
    }),
  );
}

function EmptyState({ tab }: { tab: StatusTab }) {
  if (tab === "pending") {
    return <p className="text-sm text-muted-foreground">No pending signals. Check back later.</p>;
  }

  if (tab === "reviewed") {
    return <p className="text-sm text-muted-foreground">No reviewed signals yet.</p>;
  }

  if (tab === "archived") {
    return <p className="text-sm text-muted-foreground">No archived signals.</p>;
  }

  return (
    <p className="text-sm text-muted-foreground">
      No signals received yet. Make sure your lab profile is complete and recruiting is enabled.
    </p>
  );
}

function QuickActionsSection({
  currentlyRecruiting,
  recruitingMessage,
  onToggleRecruiting,
  onSaveMessage,
  isToggling,
  isSavingMessage,
  updateError,
}: {
  currentlyRecruiting: boolean;
  recruitingMessage: string;
  onToggleRecruiting: () => Promise<void>;
  onSaveMessage: (message: string) => Promise<void>;
  isToggling: boolean;
  isSavingMessage: boolean;
  updateError: string | null;
}) {
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [draftMessage, setDraftMessage] = useState(recruitingMessage);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold">Toggle Recruiting Status</p>
          <p className="text-sm text-muted-foreground">
            Current status:{" "}
            <span className="font-medium text-foreground">
              {currentlyRecruiting ? "Actively Recruiting" : "Not Recruiting"}
            </span>
          </p>
          <Button
            type="button"
            variant="faculty"
            onClick={() => void onToggleRecruiting()}
            disabled={isToggling}
            className="w-full"
          >
            {isToggling
              ? "Updating..."
              : currentlyRecruiting
                ? "Set as Not Recruiting"
                : "Set as Actively Recruiting"}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Update Recruiting Message</p>
          {!isEditingMessage ? (
            <button
              type="button"
              className="w-full rounded-md border border-border/80 bg-background px-3 py-2 text-left text-sm hover:bg-muted/40"
              onClick={() => {
                setDraftMessage(recruitingMessage);
                setIsEditingMessage(true);
              }}
            >
              {recruitingMessage.trim().length > 0 ? recruitingMessage : "Click to add a recruiting message."}
            </button>
          ) : (
            <Textarea
              value={draftMessage}
              maxLength={300}
              onChange={(event) => setDraftMessage(event.target.value)}
              onBlur={() => {
                setIsEditingMessage(false);
                void onSaveMessage(draftMessage.trim());
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  setIsEditingMessage(false);
                  void onSaveMessage(draftMessage.trim());
                }
              }}
              className="min-h-24"
              autoFocus
            />
          )}
          <p className="text-xs text-muted-foreground">{draftMessage.length}/300</p>
          {isSavingMessage ? <p className="text-xs text-muted-foreground">Saving message...</p> : null}
        </div>

        {updateError ? <p className="text-sm text-destructive">{updateError}</p> : null}
      </CardContent>
    </Card>
  );
}

export function FacultyDashboardClient({
  labSummary,
  initialSignals,
}: FacultyDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<StatusTab>("pending");
  const [signals, setSignals] = useState(initialSignals);
  const [updatingSignalId, setUpdatingSignalId] = useState<string | null>(null);
  const [currentlyRecruiting, setCurrentlyRecruiting] = useState(labSummary.currentlyRecruiting);
  const [recruitingMessage, setRecruitingMessage] = useState(labSummary.recruitingMessage);
  const [isTogglingRecruiting, setIsTogglingRecruiting] = useState(false);
  const [isSavingMessage, setIsSavingMessage] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [exitingSignalIds, setExitingSignalIds] = useState<string[]>([]);
  const [animatedStats, setAnimatedStats] = useState({ total: 0, pending: 0, reviewed: 0, archived: 0 });
  const hasAnimatedStats = useRef(false);

  const signalStats = useMemo(() => {
    const pending = signals.filter((signal) => signal.status === "pending").length;
    const reviewed = signals.filter((signal) => signal.status === "reviewed").length;
    const archived = signals.filter((signal) => signal.status === "archived").length;
    return {
      total: signals.length,
      pending,
      reviewed,
      archived,
    };
  }, [signals]);

  const filteredSignals = useMemo(() => {
    if (activeTab === "all") {
      return signals;
    }
    return signals.filter((signal) => signal.status === activeTab);
  }, [activeTab, signals]);

  useEffect(() => {
    if (hasAnimatedStats.current) {
      setAnimatedStats(signalStats);
      return;
    }

    const startedAt = performance.now();
    const duration = 600;
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);

      setAnimatedStats({
        total: Math.round(signalStats.total * progress),
        pending: Math.round(signalStats.pending * progress),
        reviewed: Math.round(signalStats.reviewed * progress),
        archived: Math.round(signalStats.archived * progress),
      });

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        hasAnimatedStats.current = true;
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frameId);
  }, [signalStats]);

  const setSignalStatus = async (signalId: string, status: "reviewed" | "archived") => {
    setUpdateError(null);
    setUpdatingSignalId(signalId);

    const previousSignal = signals.find((signal) => signal.id === signalId);
    const wasPending = previousSignal?.status === "pending";
    const shouldAnimateExit = wasPending && status === "reviewed";

    try {
      if (shouldAnimateExit) {
        setExitingSignalIds((previous) =>
          previous.includes(signalId) ? previous : [...previous, signalId],
        );
        await new Promise((resolve) => {
          window.setTimeout(resolve, 200);
        });
      }

      const updatedSignal = await trpcClient.faculty.updateSignalStatus.mutate({
        signalId,
        status,
      });

      setSignals((previous) =>
        previous.map((signal) =>
          signal.id === signalId
            ? {
                ...signal,
                status: updatedSignal.status,
                reviewedAt: updatedSignal.reviewedAt ?? null,
              }
            : signal,
        ),
      );

      if (wasPending && (status === "reviewed" || status === "archived")) {
        dispatchPendingCountDelta(-1);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update signal status.";
      setUpdateError(message);
    } finally {
      setExitingSignalIds((previous) => previous.filter((id) => id !== signalId));
      setUpdatingSignalId(null);
    }
  };

  const toggleRecruitingStatus = async () => {
    setUpdateError(null);
    setIsTogglingRecruiting(true);
    try {
      const next = await trpcClient.faculty.toggleRecruitingStatus.mutate();
      setCurrentlyRecruiting(next.currentlyRecruiting);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update recruiting status.";
      setUpdateError(message);
    } finally {
      setIsTogglingRecruiting(false);
    }
  };

  const saveRecruitingMessage = async (message: string) => {
    setUpdateError(null);
    setIsSavingMessage(true);
    try {
      const result = await trpcClient.faculty.updateRecruitingMessage.mutate({ message });
      setRecruitingMessage(result.recruitingMessage);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Could not update recruiting message.";
      setUpdateError(messageText);
    } finally {
      setIsSavingMessage(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-2xl">{labSummary.labName || "Research Lab"}</CardTitle>
              <p className="text-sm text-muted-foreground">{labSummary.department || "Department not listed"}</p>
            </div>
            <Badge
              className={cn(
                "transition-colors duration-200",
                currentlyRecruiting
                  ? "border-[#2d5282]/30 bg-[#2d5282]/12 text-[#1e3a5f] dark:border-[#2d5282]/70 dark:bg-[#2d5282]/25 dark:text-blue-100"
                  : "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
              )}
            >
              {currentlyRecruiting ? "Actively Recruiting" : "Not Recruiting"}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border border-border/80 border-t-[3px] border-t-[#2d5282] bg-card/70 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Total Signals</p>
              <p className="mt-1 text-2xl font-semibold">{animatedStats.total}</p>
            </div>
            <div className="rounded-md border border-border/80 border-t-[3px] border-t-[#2d5282] bg-card/70 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Pending Review</p>
              <p className="mt-1 text-2xl font-semibold">{animatedStats.pending}</p>
            </div>
            <div className="rounded-md border border-border/80 border-t-[3px] border-t-[#2d5282] bg-card/70 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Reviewed</p>
              <p className="mt-1 text-2xl font-semibold">{animatedStats.reviewed}</p>
            </div>
            <div className="rounded-md border border-border/80 border-t-[3px] border-t-[#2d5282] bg-card/70 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Archived</p>
              <p className="mt-1 text-2xl font-semibold">{animatedStats.archived}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/profile/faculty/edit" className={buttonVariants({ variant: "outline" })}>
              Edit Lab Profile
            </Link>
            <Link href={`/lab/${labSummary.facultyId}`} className={buttonVariants({ variant: "secondary" })}>
              View Public Lab Page
            </Link>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4">
          <header className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">Student Interest Signals</h2>
            <p className="text-sm text-muted-foreground">Students who expressed interest in your lab</p>
          </header>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {statusTabs.map((tab) => (
              <Button
                key={tab}
                type="button"
                variant={activeTab === tab ? "faculty" : "outline"}
                className="shrink-0 rounded-full"
                onClick={() => setActiveTab(tab)}
              >
                {statusTabLabelMap[tab]}
              </Button>
            ))}
          </div>

          {filteredSignals.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <EmptyState tab={activeTab} />
              </CardContent>
            </Card>
          ) : (
            filteredSignals.map((signal) => (
              <Card
                key={signal.id}
                className={cn(
                  "transition-all duration-200 ease-out",
                  exitingSignalIds.includes(signal.id) ? "translate-x-2 opacity-0" : "translate-x-0 opacity-100",
                )}
              >
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{getInitials(signal.studentName)}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <CardTitle className="text-xl">{signal.studentName}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {signal.degreeType} · {signal.yearLevel}
                        </p>
                        <p className="text-sm text-muted-foreground">{signal.department}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={statusStyleMap[signal.status]}>{statusLabelMap[signal.status]}</Badge>
                      {signal.status === "reviewed" && signal.reviewedAt ? (
                        <Badge variant="outline">Reviewed on {formatDate(signal.reviewedAt)}</Badge>
                      ) : null}
                      {signal.status === "archived" ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          Archived
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="whitespace-pre-line text-sm leading-7 text-foreground">{signal.message || "No message provided."}</p>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Research Interests
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {signal.topInterests.length > 0 ? (
                        signal.topInterests.map((interest) => (
                          <Badge key={`${signal.id}-${interest}`} variant="secondary">
                            {interest}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No listed interests.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {signal.topSkills.length > 0 ? (
                        signal.topSkills.map((skill) => (
                          <Badge key={`${signal.id}-${skill}`} variant="outline">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No listed skills.</p>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">Sent on {formatDate(signal.createdAt)}</p>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Link
                      href={`/student/${signal.studentId}`}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(buttonVariants({ variant: "secondary" }), "w-full sm:w-auto")}
                    >
                      View Profile
                    </Link>
                    <Button
                      type="button"
                      variant="faculty"
                      className="w-full sm:w-auto"
                      onClick={() => void setSignalStatus(signal.id, "reviewed")}
                      disabled={updatingSignalId === signal.id || signal.status === "reviewed"}
                    >
                      Mark Reviewed
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => void setSignalStatus(signal.id, "archived")}
                      disabled={updatingSignalId === signal.id || signal.status === "archived"}
                    >
                      Archive
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </section>

        <aside className="hidden lg:block">
          <QuickActionsSection
            currentlyRecruiting={currentlyRecruiting}
            recruitingMessage={recruitingMessage}
            onToggleRecruiting={toggleRecruitingStatus}
            onSaveMessage={saveRecruitingMessage}
            isToggling={isTogglingRecruiting}
            isSavingMessage={isSavingMessage}
            updateError={updateError}
          />
        </aside>
      </div>

      <div className="lg:hidden">
        <QuickActionsSection
          currentlyRecruiting={currentlyRecruiting}
          recruitingMessage={recruitingMessage}
          onToggleRecruiting={toggleRecruitingStatus}
          onSaveMessage={saveRecruitingMessage}
          isToggling={isTogglingRecruiting}
          isSavingMessage={isSavingMessage}
          updateError={updateError}
        />
      </div>
    </div>
  );
}
