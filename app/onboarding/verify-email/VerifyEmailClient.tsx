"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpcClient } from "@/lib/trpc/client";

type VerifyEmailClientProps = {
  defaultEmail: string;
  isAuthenticated: boolean;
};

export function VerifyEmailClient({ defaultEmail, isAuthenticated }: VerifyEmailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [institutionalEmail, setInstitutionalEmail] = useState(defaultEmail);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handledTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token || handledTokenRef.current === token) {
      return;
    }

    handledTokenRef.current = token;
    setIsVerifying(true);
    setIsVerified(false);
    setStatusMessage("Verifying your institutional email...");
    setErrorMessage(null);

    void trpcClient.auth.verifyInstitutionalEmail
      .mutate({ token })
      .then(() => {
        setIsVerified(true);
        setStatusMessage("Affiliation verified. Redirecting to sign in...");
        router.push("/auth/login?verified=1");
        router.refresh();
      })
      .catch(() => {
        setStatusMessage(null);
        setErrorMessage("Link expired or invalid.");
      })
      .finally(() => {
        setIsVerifying(false);
      });
  }, [router, searchParams]);

  const sendVerification = async (emailToSend: string) => {
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await trpcClient.auth.submitInstitutionalEmail.mutate({
        email: emailToSend,
      });

      setSentEmail(response.institutionalEmail);
      setStatusMessage(`Verification email sent to ${response.institutionalEmail}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send verification email.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendVerification(institutionalEmail);
  };

  const handleResend = async () => {
    if (!isAuthenticated) {
      router.push("/auth/login?next=/onboarding/verify-email");
      return;
    }

    const email = sentEmail ?? institutionalEmail;
    await sendVerification(email);
  };

  const hasToken = Boolean(searchParams.get("token"));

  return (
    <section className="mx-auto max-w-2xl space-y-6 rounded-xl border bg-card p-8 shadow-sm">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Verify institutional email</h1>
        <p className="text-sm text-muted-foreground">
          Use your university email to verify affiliation before accessing full Researcher features.
        </p>
      </div>

      {!hasToken ? (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="institutional-email" className="text-sm font-medium">
              Institutional email
            </label>
            <Input
              id="institutional-email"
              name="institutional-email"
              type="email"
              placeholder="you@umd.edu"
              value={institutionalEmail}
              onChange={(event) => setInstitutionalEmail(event.target.value)}
              disabled={isSubmitting || isVerifying}
              required
            />
            <p className="text-xs text-muted-foreground">
              Accepted examples: @umd.edu, @cs.umd.edu, @umiacs.umd.edu, and other .edu domains.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isSubmitting || isVerifying}>
              {isSubmitting ? "Sending..." : "Send verification email"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={isSubmitting || isVerifying || (!sentEmail && !institutionalEmail)}
            >
              Resend email
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4 rounded-lg border border-border/80 bg-muted/30 p-4">
          {isVerifying ? (
            <p className="text-sm text-muted-foreground">Verifying your affiliation link...</p>
          ) : null}

          {isVerified ? (
            <p className="text-sm text-primary">Verification complete. Redirecting to sign in...</p>
          ) : null}

          {!isVerifying && !isVerified ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">Link expired or invalid.</p>
              <Button type="button" onClick={handleResend} disabled={isSubmitting || isVerifying}>
                {isAuthenticated ? "Resend verification email" : "Sign in to resend"}
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {statusMessage ? <p className="text-sm text-primary">{statusMessage}</p> : null}
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div className="rounded-lg border border-border/80 bg-muted/30 p-4 text-sm text-muted-foreground">
        <p>
          Verification links expire in 24 hours. Open the message in your institutional inbox and click
          the verify button to continue.
        </p>
      </div>
    </section>
  );
}
