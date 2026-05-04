import Link from "next/link";
import { GoogleSignInButton } from "@/app/auth/login/GoogleSignInButton";

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-md space-y-6 rounded-xl border bg-card p-8 shadow-sm">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Use your Google account to access Researcher.
        </p>
      </div>

      <GoogleSignInButton />

      <p className="text-xs text-muted-foreground">
        By continuing, you agree to the platform access policy for UMD/AIM/UMIACS.
      </p>
      <Link href="/" className="block text-xs text-muted-foreground underline-offset-4 hover:underline">
        Back to home
      </Link>
    </section>
  );
}
