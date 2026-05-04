import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function VerifyEmailPage() {
  return (
    <section className="mx-auto max-w-xl space-y-5 rounded-xl border bg-card p-8 shadow-sm">
      <h1 className="text-3xl font-semibold tracking-tight">Institutional Verification</h1>
      <p className="text-sm text-muted-foreground">
        Phase 1.2 will verify your institutional email affiliation before profile creation.
      </p>
      <Link href="/dashboard" className={buttonVariants()}>
        Go to Dashboard
      </Link>
    </section>
  );
}
