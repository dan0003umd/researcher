export default function DashboardLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="h-10 w-72 animate-pulse rounded bg-muted" />
      </div>

      <div className="rounded-xl border border-border/90 bg-card p-5 shadow-sm">
        <div className="space-y-3">
          <div className="h-6 w-52 animate-pulse rounded bg-muted" />
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="h-2 w-full animate-pulse rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-36 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-border/90 bg-card p-5 shadow-sm">
            <div className="space-y-3">
              <div className="h-6 w-44 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-[88%] animate-pulse rounded bg-muted" />
              <div className="h-20 w-full animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
