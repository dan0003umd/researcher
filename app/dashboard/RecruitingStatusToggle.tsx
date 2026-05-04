"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpcClient } from "@/lib/trpc/client";

type RecruitingStatusToggleProps = {
  initialRecruiting: boolean;
  recruitingMessage: string | null;
};

export function RecruitingStatusToggle({
  initialRecruiting,
  recruitingMessage,
}: RecruitingStatusToggleProps) {
  const [isRecruiting, setIsRecruiting] = useState(initialRecruiting);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleRecruiting = async () => {
    setIsSaving(true);
    setError(null);
    const nextValue = !isRecruiting;

    try {
      await trpcClient.profile.setRecruitingStatus.mutate({
        recruiting: nextValue,
        message: nextValue ? recruitingMessage || "Open to student collaborators." : undefined,
      });
      setIsRecruiting(nextValue);
    } catch (toggleError) {
      const message = toggleError instanceof Error ? toggleError.message : "Could not update recruiting status.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/90 bg-card p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">Recruiting Status</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xl font-semibold">{isRecruiting ? "Open to students" : "Not open right now"}</p>
          <p className="text-sm text-muted-foreground">
            {isRecruiting
              ? "Students can discover your lab as actively recruiting."
              : "Students can still view your profile, but you appear as not recruiting."}
          </p>
        </div>
        <Button type="button" onClick={toggleRecruiting} disabled={isSaving}>
          {isSaving ? "Updating..." : isRecruiting ? "Turn Off" : "Turn On"}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
