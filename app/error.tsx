"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-4 rounded-lg border bg-card p-6">
      <h2 className="text-xl font-semibold tracking-tight">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        We could not load this page. Please try again.
      </p>
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  );
}
