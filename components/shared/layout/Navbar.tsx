"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type NavbarUser = {
  email: string | null;
  role: "student" | "faculty" | "researcher" | "coordinator" | "unverified" | null;
  pendingSignalCount: number;
};

type NavbarProps = {
  user: NavbarUser | null;
  initialTheme: ThemeMode;
};

type ThemeMode = "light" | "dark";

const baseNavLinks: Array<{ href: string; label: string }> = [
  { href: "/discover", label: "Discover" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
];

function canSeeSignals(role: NavbarUser["role"]) {
  return role === "faculty" || role === "researcher" || role === "coordinator";
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
}

function MinimalRMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-8 w-8 rounded-md"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" className="fill-primary/15" />
      <path
        d="M7 6.5h6.3c2.3 0 3.9 1.5 3.9 3.6 0 1.7-1 3-2.7 3.4l2.8 3.9h-3.2l-2.5-3.6H9.8v3.6H7V6.5Zm2.8 2.3v2.8h3.1c1 0 1.6-.5 1.6-1.4S13.9 8.8 12.9 8.8H9.8Z"
        className="fill-primary"
      />
    </svg>
  );
}

function emailToInitials(email: string | null) {
  if (!email) {
    return "U";
  }

  const localPart = email.split("@")[0] ?? "u";
  const segments = localPart.split(/[._-]/).filter(Boolean);

  if (segments.length >= 2) {
    return `${segments[0][0]}${segments[1][0]}`.toUpperCase();
  }

  return localPart.slice(0, 2).toUpperCase();
}

export function Navbar({ user, initialTheme }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const initials = useMemo(() => emailToInitials(user?.email ?? null), [user?.email]);
  const navLinks = useMemo(() => {
    const links = [...baseNavLinks];

    if (user && canSeeSignals(user.role)) {
      links.push({ href: "/dashboard/faculty", label: "Signals" });
    }

    return links;
  }, [user]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    document.cookie = `theme=${nextTheme}; path=/; max-age=31536000; samesite=lax`;
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await fetch("/api/auth", {
        method: "POST",
      });
    } finally {
      setIsSigningOut(false);
      router.push("/auth/login");
      router.refresh();
    }
  };

  return (
    <header className="border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <MinimalRMark />
          <span className="font-heading text-2xl leading-none tracking-tight">Researcher</span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const showNotificationDot =
              link.href === "/dashboard/faculty" && Boolean(user && user.pendingSignalCount > 0);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative text-sm font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span>{link.label}</span>
                {showNotificationDot ? (
                  <span
                    className="absolute -right-3 top-0 inline-flex h-2 w-2 rounded-full bg-red-500"
                    aria-label="New pending signals"
                  />
                ) : null}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-full text-xs font-semibold"
                  aria-label="Open profile menu"
                >
                  {initials}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{user.email ?? "Signed in"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    if (!isSigningOut) {
                      void handleSignOut();
                    }
                  }}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? "Signing out..." : "Sign Out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/auth/login"
              className={buttonVariants({
                className: "bg-primary text-primary-foreground hover:bg-primary/90",
              })}
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
