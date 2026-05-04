"use client";

import { Button } from "@/components/ui/button";

type VerifyEmailErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function VerifyEmailError({ error, reset }: VerifyEmailErrorProps) {
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-xl border bg-card p-6">
      <h2 className="text-xl font-semibold tracking-tight">Unable to load verification step</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
