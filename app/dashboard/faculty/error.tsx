"use client";

import { Button } from "@/components/ui/button";

type FacultyDashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function FacultyDashboardError({ error, reset }: FacultyDashboardErrorProps) {
  return (
    <section className="mx-auto max-w-md space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      <h1 className="text-xl font-semibold tracking-tight">Unable to load faculty dashboard</h1>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button type="button" variant="outline" onClick={reset}>
        Try again
      </Button>
    </section>
  );
}
