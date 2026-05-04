export default function StudentProfileLoading() {
  return (
    <section className="space-y-6">
      <div className="h-9 w-24 animate-pulse rounded bg-muted" />
      <div className="rounded-xl border border-border/90 bg-card p-6 shadow-sm">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-10 w-64 animate-pulse rounded bg-muted" />
            <div className="h-4 w-56 animate-pulse rounded bg-muted" />
            <div className="h-4 w-44 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-6 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-[94%] animate-pulse rounded bg-muted" />
            <div className="h-4 w-[86%] animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-6 w-24 animate-pulse rounded-full bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
