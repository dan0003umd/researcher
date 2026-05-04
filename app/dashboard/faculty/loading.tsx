export default function FacultyDashboardLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-36 animate-pulse rounded bg-muted" />
        <div className="h-10 w-80 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-border/90 bg-card p-6 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-2">
                  <div className="h-6 w-48 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
                <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-[92%] animate-pulse rounded bg-muted" />
              </div>
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="flex justify-between gap-3">
                <div className="flex gap-2">
                  <div className="h-8 w-28 animate-pulse rounded bg-muted" />
                  <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-8 w-24 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
