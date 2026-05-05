import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/70 bg-[#f3f0ec]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Researcher. Built for UMD &middot; AIM &middot; UMIACS</p>
        <div className="flex items-center gap-4">
          <Link href="/discover" className="transition-colors hover:text-foreground">
            Discover
          </Link>
          <Link href="/about" className="transition-colors hover:text-foreground">
            About
          </Link>
          <Link href="/auth/login" className="transition-colors hover:text-foreground">
            Sign In
          </Link>
        </div>
      </div>
    </footer>
  );
}
