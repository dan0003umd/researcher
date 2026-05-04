import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/90 bg-card/40">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
        <p>Researcher Platform</p>
        <Link href="/about" className="transition-colors hover:text-foreground">
          About
        </Link>
      </div>
    </footer>
  );
}
