export default function StudentSignalsLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="h-10 w-56 animate-pulse rounded bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded bg-muted" />
      </div>

      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border/90 bg-card p-5 shadow-sm">
          <div className="space-y-3">
            <div className="h-6 w-52 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
            <div className="h-16 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </section>
  );
}
