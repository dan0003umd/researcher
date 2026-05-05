import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="space-y-20 pb-10 sm:space-y-24">
      <section className="space-y-7 pt-8 sm:pt-14">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
          UMD &middot; AIM &middot; UMIACS
        </p>
        <div className="space-y-5">
          <h1 className="max-w-4xl text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Research collaboration starts here.
          </h1>
          <p className="max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
            Researcher connects UMD students with the right labs, professors with the right students,
            and researchers with the right collaborators - without cold emails.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/discover" className={buttonVariants()}>
            Find Your Lab
          </Link>
          <Link href="/auth/login" className={buttonVariants({ variant: "ghost" })}>
            Sign In
          </Link>
        </div>
      </section>

      <section className="space-y-8">
        <h2 className="text-3xl tracking-tight sm:text-4xl">Built for how research actually works</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <article className="space-y-3 rounded-xl border border-border/90 bg-card/70 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">01</p>
            <h3 className="text-xl">Create your profile</h3>
            <p className="text-sm leading-7 text-muted-foreground">
              Build a structured profile that captures your research interests, skills, and experience.
            </p>
          </article>
          <article className="space-y-3 rounded-xl border border-border/90 bg-card/70 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">02</p>
            <h3 className="text-xl">Discover your match</h3>
            <p className="text-sm leading-7 text-muted-foreground">
              Browse labs and collaborators aligned with your research direction and goals.
            </p>
          </article>
          <article className="space-y-3 rounded-xl border border-border/90 bg-card/70 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">03</p>
            <h3 className="text-xl">Start collaborating</h3>
            <p className="text-sm leading-7 text-muted-foreground">
              Express interest, connect directly, and move from discovery to active research work.
            </p>
          </article>
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <article className="space-y-4 rounded-xl border border-border/90 bg-card/70 p-7">
          <h2 className="text-3xl tracking-tight">For Students</h2>
          <ul className="space-y-2 text-sm leading-7 text-muted-foreground">
            <li>Find labs that match your exact interests, methods, and experience level.</li>
            <li>Show faculty your profile, not just a cold email subject line.</li>
            <li>Track your expressed interest and follow-ups in one place.</li>
          </ul>
        </article>
        <article className="space-y-4 rounded-xl border border-border/90 bg-card/70 p-7">
          <h2 className="text-3xl tracking-tight">For Faculty</h2>
          <ul className="space-y-2 text-sm leading-7 text-muted-foreground">
            <li>See qualified student interest signals with profile context immediately.</li>
            <li>Filter verified student profiles by interests, skills, and availability.</li>
            <li>Reduce inbox noise and focus on the right potential collaborators faster.</li>
          </ul>
        </article>
      </section>

      <section className="rounded-2xl border border-border/90 bg-card/80 px-6 py-10 text-center sm:px-10">
        <div className="mx-auto max-w-2xl space-y-4">
          <h2 className="text-3xl tracking-tight sm:text-4xl">Ready to find your research home?</h2>
          <Link href="/auth/login" className={cn(buttonVariants({ size: "lg" }), "inline-flex")}>
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}
