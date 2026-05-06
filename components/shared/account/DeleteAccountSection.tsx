"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpcClient } from "@/lib/trpc/client";

type DeleteAccountSectionProps = {
  ownerType: "student" | "faculty";
};

export function DeleteAccountSection({ ownerType }: DeleteAccountSectionProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isConfirmed = confirmationText === "DELETE";

  const handleDeleteAccount = async () => {
    if (!isConfirmed || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await trpcClient.profile.deleteAccount.mutate();
      await fetch("/api/auth", { method: "POST" });
      router.push("/?deleted=true");
      router.refresh();
    } catch {
      setErrorMessage("Something went wrong. Please try again or contact support.");
      setIsDeleting(false);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setConfirmationText("");
          setErrorMessage(null);
          setIsDialogOpen(true);
        }}
        className="border-destructive/60 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        Delete Account
      </Button>

      {isDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-xl">
            <div className="space-y-3">
              <h3 className="text-2xl font-semibold tracking-tight">Delete your account?</h3>
              <p className="text-sm text-muted-foreground">
                This will permanently delete:
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Your profile and all personal information</li>
                <li>• All interest signals you have sent</li>
                <li>• Your account login credentials</li>
              </ul>
              <p className="text-sm font-medium text-foreground">This cannot be undone.</p>
              <p className="text-xs text-muted-foreground">
                {ownerType === "faculty"
                  ? "Signals sent to your lab will also be permanently deleted."
                  : "Any signals connected to your account will be permanently deleted."}
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <label htmlFor="delete-confirmation" className="text-sm font-medium">
                Type DELETE to confirm
              </label>
              <Input
                id="delete-confirmation"
                value={confirmationText}
                onChange={(event) => setConfirmationText(event.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>

            {errorMessage ? <p className="mt-3 text-sm text-destructive">{errorMessage}</p> : null}

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (!isDeleting) {
                    setIsDialogOpen(false);
                  }
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  void handleDeleteAccount();
                }}
                disabled={!isConfirmed || isDeleting}
              >
                {isDeleting ? "Deleting..." : "Permanently Delete Account"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
