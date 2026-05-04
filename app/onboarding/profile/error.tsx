"use client";

import { Button } from "@/components/ui/button";

type ProfileOnboardingErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ProfileOnboardingError({ error, reset }: ProfileOnboardingErrorProps) {
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-xl border bg-card p-6">
      <h2 className="text-xl font-semibold tracking-tight">Unable to load profile onboarding</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
