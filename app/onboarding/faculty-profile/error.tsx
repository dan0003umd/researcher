"use client";

import { Button } from "@/components/ui/button";

type FacultyProfileErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function FacultyProfileError({ error, reset }: FacultyProfileErrorProps) {
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-xl border bg-card p-6">
      <h2 className="text-xl font-semibold tracking-tight">Unable to load faculty profile setup</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}

