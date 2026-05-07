"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpcClient } from "@/lib/trpc/client";

type FacultySignalBannerProps = {
  signalId: string;
  createdAt: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function FacultySignalBanner({ signalId, createdAt }: FacultySignalBannerProps) {
  const [status, setStatus] = useState<"pending" | "reviewed" | "archived">("pending");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (nextStatus: "reviewed" | "archived") => {
    setError(null);
    setIsSaving(true);
    try {
      await trpcClient.faculty.updateSignalStatus.mutate({
        signalId,
        status: nextStatus,
      });
      setStatus(nextStatus);
      if (nextStatus === "reviewed" || nextStatus === "archived") {
        window.dispatchEvent(
          new CustomEvent("faculty-pending-signals-change", {
            detail: { delta: -1 },
          }),
        );
      }
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : "Could not update signal status.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (status !== "pending") {
    return null;
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
      <p className="text-sm font-medium">
        This student sent you an interest signal on {formatDate(createdAt)}.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={() => void updateStatus("reviewed")}
          disabled={isSaving}
        >
          Mark Reviewed
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void updateStatus("archived")}
          disabled={isSaving}
        >
          Archive
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
