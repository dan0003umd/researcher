"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

type StudentProfileEditErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function StudentProfileEditError({ error, reset }: StudentProfileEditErrorProps) {
  return (
    <div className="space-y-4 rounded-xl border bg-card p-6">
      <h2 className="text-xl font-semibold tracking-tight">Profile edit unavailable</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
        <Link href="/dashboard" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
