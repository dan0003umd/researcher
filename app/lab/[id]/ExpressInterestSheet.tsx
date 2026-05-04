"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { trpcClient } from "@/lib/trpc/client";

type StudentSignalSummary = {
  displayName: string;
  topInterests: string[];
  topSkills: string[];
};

type ExpressInterestSheetProps = {
  facultyId: string;
  facultyName: string;
  studentSummary: StudentSignalSummary;
};

const maxMessageLength = 300;

export function ExpressInterestSheet({ facultyId, facultyName, studentSummary }: ExpressInterestSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const charactersUsed = useMemo(() => message.length, [message]);

  const handleSubmit = async () => {
    const trimmed = message.trim();

    if (trimmed.length === 0) {
      setErrorMessage("Please share why you are interested in this lab.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await trpcClient.discover.createInterestSignal.mutate({
        facultyId,
        message: trimmed,
      });

      setMessage("");
      setOpen(false);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not send your interest signal.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button">Express Interest</Button>
      </SheetTrigger>

      <SheetContent side="right" className="space-y-6 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Express interest in {facultyName}</SheetTitle>
          <SheetDescription>
            Send a short note so this lab knows why you are a strong fit.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 rounded-lg border border-border/90 bg-card p-4">
          <p className="text-sm font-semibold">Your Profile Snapshot</p>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Name:</span> {studentSummary.displayName}
            </p>
            <div className="space-y-1">
              <p className="font-medium">Top Interests</p>
              <div className="flex flex-wrap gap-1.5">
                {studentSummary.topInterests.length > 0 ? (
                  studentSummary.topInterests.map((interest) => (
                    <Badge key={interest} variant="secondary">
                      {interest}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No interests added yet</p>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Top Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {studentSummary.topSkills.length > 0 ? (
                  studentSummary.topSkills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No skills added yet</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="interest-message" className="text-sm font-medium">
            Why are you interested in this lab?
          </label>
          <Textarea
            id="interest-message"
            value={message}
            onChange={(event) => setMessage(event.target.value.slice(0, maxMessageLength))}
            placeholder="Share your research goals, relevant experience, and what you hope to contribute."
            className="min-h-32"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Required</span>
            <span>
              {charactersUsed}/{maxMessageLength}
            </span>
          </div>
          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        </div>

        <SheetFooter className="justify-between">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Submit Interest
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
