import { LabCardSkeleton } from "@/components/shared/cards/LabCard";

export default function DiscoverLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-10 w-80 animate-pulse rounded bg-muted" />
        <div className="h-4 w-44 animate-pulse rounded bg-muted" />
      </div>

      <div className="grid gap-6 md:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden rounded-xl border border-border/90 bg-card/60 p-5 md:block">
          <div className="space-y-3">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-9 w-full animate-pulse rounded bg-muted" />
            <div className="h-9 w-full animate-pulse rounded bg-muted" />
            <div className="h-64 w-full animate-pulse rounded bg-muted" />
          </div>
        </aside>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <LabCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

