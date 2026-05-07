import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "About",
  description:
    "Learn how Researcher helps UMD students find research labs and helps faculty discover motivated student collaborators.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="space-y-16 pb-10 sm:space-y-20">
      <section className="marketing-headings space-y-6 pt-6 sm:pt-10">
        <h1 className="max-w-4xl text-4xl leading-tight tracking-tight sm:text-5xl">
          Connecting Students with Research Opportunities
        </h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
          Researcher is a platform built for the University of Maryland community. We help students find faculty labs
          that match their interests, skills, and goals - and help faculty find motivated collaborators.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/discover" className={buttonVariants()}>
            Browse Labs
          </Link>
          <Link href="/auth/login" className={buttonVariants({ variant: "outline" })}>
            Create Your Profile
          </Link>
        </div>
      </section>

      <section className="marketing-headings rounded-2xl border border-border/90 bg-card/70 p-6 sm:p-8">
        <h2 className="text-3xl tracking-tight">How It Works</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card className="border-border/80 bg-background/80">
            <CardHeader>
              <CardTitle className="text-2xl">For Students</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm leading-7 text-muted-foreground">
                <li>Step 1: Create your profile - research interests, skills, availability</li>
                <li>Step 2: Browse labs on Discover</li>
                <li>Step 3: Send an interest signal to labs you like</li>
                <li>Step 4: Connect and collaborate</li>
              </ol>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-background/80">
            <CardHeader>
              <CardTitle className="text-2xl">For Faculty / Researchers</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm leading-7 text-muted-foreground">
                <li>Step 1: Create your lab profile</li>
                <li>Step 2: Set your recruiting preferences</li>
                <li>Step 3: Review interest signals from students</li>
                <li>Step 4: Find your next research collaborator</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="marketing-headings space-y-6">
        <h2 className="text-3xl tracking-tight">Built for the UMD Research Community</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/90 bg-card/70">
            <CardHeader>
              <CardTitle className="text-xl">Undergraduate Students</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-muted-foreground">
              Explore research labs and find opportunities to get hands-on experience before graduation.
            </CardContent>
          </Card>

          <Card className="border-border/90 bg-card/70">
            <CardHeader>
              <CardTitle className="text-xl">Graduate Students &amp; Postdocs</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-muted-foreground">
              Find labs aligned with your thesis direction, co-authorship goals, or next career step.
            </CardContent>
          </Card>

          <Card className="border-border/90 bg-card/70">
            <CardHeader>
              <CardTitle className="text-xl">Faculty &amp; Principal Investigators</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-muted-foreground">
              Post your lab, set recruiting preferences, and discover motivated students ready to contribute.
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="marketing-headings rounded-2xl border border-border/90 bg-card/70 p-6 sm:p-8">
        <div className="space-y-4">
          <h2 className="text-3xl tracking-tight">Supporting UMD Research Organizations</h2>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            Researcher is designed to support the broader research ecosystem at the University of Maryland, including:
          </p>
          <ul className="space-y-2 text-sm leading-7 text-muted-foreground">
            <li>- AIM (Artificial Intelligence for the Modern Inference)</li>
            <li>- UMIACS (University of Maryland Institute for Advanced Computer Studies)</li>
            <li>- TRAILS (Transportation Research @ UMD)</li>
            <li>- Department of Computer Science</li>
            <li>- College of Information Studies (iSchool)</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Want your research org listed? Reach out at <span className="font-medium">contact@researcher.umd.edu</span>
          </p>
        </div>
      </section>

      <section className="marketing-headings rounded-2xl border border-border/90 bg-card/80 px-6 py-10 text-center sm:px-10">
        <div className="mx-auto max-w-2xl space-y-3">
          <h2 className="text-3xl tracking-tight sm:text-4xl">Ready to get started?</h2>
          <p className="text-sm text-muted-foreground">Join the UMD research community today.</p>
          <Link href="/auth/login" className={cn(buttonVariants({ size: "lg" }), "inline-flex")}>
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}
