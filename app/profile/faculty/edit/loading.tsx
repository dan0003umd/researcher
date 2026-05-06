export default function FacultyProfileEditLoading() {
  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-9 w-56 animate-pulse rounded bg-muted" />
      </div>

      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border/90 bg-card p-5 shadow-sm">
          <div className="space-y-3">
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
            <div className="h-20 w-full animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </section>
  );
}
