import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
          UMD / AIM / UMIACS
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Research collaboration starts here.
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          This scaffold includes Next.js 15 App Router, shadcn/ui, Supabase SSR
          clients, and a tRPC health-check endpoint at
          <code className="ml-1 rounded bg-muted px-1.5 py-0.5 text-sm">
            /api/trpc/health.check
          </code>
          .
        </p>
      </div>
      <div className="flex gap-3">
        <Button>Explore Opportunities</Button>
        <Button variant="outline">View Labs</Button>
      </div>
    </section>
  );
}
