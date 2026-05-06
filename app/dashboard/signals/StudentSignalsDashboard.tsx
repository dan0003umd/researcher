"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SignalStatus = "pending" | "reviewed" | "archived";

export type StudentSignalItem = {
  id: string;
  facultyId: string;
  labName: string;
  piName: string;
  department: string;
  message: string;
  createdAt: string;
  reviewedAt: string | null;
  status: SignalStatus;
};

type StudentSignalsDashboardProps = {
  signals: StudentSignalItem[];
};

const statusLabelMap: Record<SignalStatus, string> = {
  pending: "Awaiting review",
  reviewed: "Reviewed \u2713",
  archived: "Archived",
};

const statusStyleMap: Record<SignalStatus, string> = {
  pending:
    "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200",
  reviewed:
    "border-primary/40 bg-primary/10 text-primary dark:border-primary/40 dark:bg-primary/20 dark:text-primary-foreground",
  archived:
    "border-neutral-300 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-300",
};

function formatSignalDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getMessagePreview(message: string) {
  const trimmed = message.trim();

  if (trimmed.length <= 100) {
    return trimmed;
  }

  return `${trimmed.slice(0, 100)}...`;
}

export function StudentSignalsDashboard({ signals }: StudentSignalsDashboardProps) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const reviewedCount = useMemo(
    () => signals.filter((signal) => signal.status === "reviewed").length,
    [signals],
  );
  const pendingCount = useMemo(
    () => signals.filter((signal) => signal.status === "pending").length,
    [signals],
  );

  const toggleExpanded = (signalId: string) => {
    setExpandedIds((previous) =>
      previous.includes(signalId)
        ? previous.filter((value) => value !== signalId)
        : [...previous, signalId],
    );
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <Link href="/dashboard" className="text-sm text-primary underline-offset-4 hover:underline">
          {"\u2190"} Dashboard
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">My Interest Signals</h1>
        <p className="text-sm text-muted-foreground">Track the status of labs you&apos;ve reached out to.</p>
        <p className="text-sm text-muted-foreground">
          {signals.length} signals sent · {reviewedCount} reviewed · {pendingCount} pending
        </p>
      </header>

      {signals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-base font-medium">You haven&apos;t expressed interest in any labs yet.</p>
              <p className="text-sm text-muted-foreground">
                Browse labs to find groups aligned with your research goals.
              </p>
            </div>
            <Link href="/discover" className={cn(buttonVariants())}>
              Browse Labs
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {signals.map((signal) => {
            const trimmedMessage = signal.message.trim();
            const hasLongMessage = trimmedMessage.length > 100;
            const isExpanded = expandedIds.includes(signal.id);

            return (
              <Card key={signal.id}>
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{signal.labName}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {signal.piName} · {signal.department}
                      </p>
                    </div>
                    <Badge className={statusStyleMap[signal.status]}>{statusLabelMap[signal.status]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Your message</p>
                    <p className="whitespace-pre-line text-sm text-muted-foreground">
                      {hasLongMessage && !isExpanded ? getMessagePreview(trimmedMessage) : trimmedMessage || "No message provided."}
                    </p>
                    {hasLongMessage ? (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(signal.id)}
                        className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {isExpanded ? "Show less" : "Show more"}
                      </button>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">Sent {formatSignalDate(signal.createdAt)}</p>
                </CardContent>
                <CardFooter className="justify-end">
                  <Link href={`/lab/${signal.facultyId}`} className={cn(buttonVariants({ variant: "outline" }))}>
                    View Lab
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
