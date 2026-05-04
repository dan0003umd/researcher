"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

function GoogleSignInButtonInner() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const supabase = createClient();
    const next = searchParams.get("next") ?? "/dashboard";

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {isLoading ? "Redirecting to Google..." : "Continue with Google"}
      </Button>
      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

export function GoogleSignInButton() {
  return (
    <Suspense
      fallback={
        <Button disabled className="w-full bg-primary text-primary-foreground opacity-50">
          Continue with Google
        </Button>
      }
    >
      <GoogleSignInButtonInner />
    </Suspense>
  );
}
