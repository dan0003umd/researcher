export default function LabProfileLoading() {
  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-border/90 bg-card p-6 shadow-sm">
        <div className="space-y-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 animate-pulse rounded-full bg-muted" />
              <div className="space-y-2">
                <div className="h-8 w-48 animate-pulse rounded bg-muted" />
                <div className="h-5 w-40 animate-pulse rounded bg-muted" />
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="h-9 w-36 animate-pulse rounded bg-muted" />
          </div>

          <div className="space-y-3">
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-[95%] animate-pulse rounded bg-muted" />
              <div className="h-4 w-[85%] animate-pulse rounded bg-muted" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-6 w-24 animate-pulse rounded-full bg-muted" />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="h-6 w-44 animate-pulse rounded bg-muted" />
            <div className="grid gap-4 rounded-lg border border-border/90 bg-card/60 p-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                  ))}
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <div className="h-3 w-36 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-[90%] animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
