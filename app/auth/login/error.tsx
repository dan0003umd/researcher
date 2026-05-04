"use client";

import { Button } from "@/components/ui/button";

type LoginErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function LoginError({ error, reset }: LoginErrorProps) {
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-xl border bg-card p-6">
      <h2 className="text-xl font-semibold tracking-tight">Unable to load sign-in</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
