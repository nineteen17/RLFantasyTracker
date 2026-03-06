"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLiveCacheIndicator } from "@/hooks/use-live-cache-indicator";
import ThemeToggle from "@/components/ui/theme-toggle";

interface NavItem {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  {
    href: "/players/search",
    label: "Players",
    isActive: (pathname) => pathname.startsWith("/players"),
  },
  {
    href: "/teams",
    label: "Teams",
    isActive: (pathname) => pathname.startsWith("/teams"),
  },
  {
    href: "/live",
    label: "Matches",
    isActive: (pathname) => pathname.startsWith("/live"),
  },
  {
    href: "/byes",
    label: "Byes",
    isActive: (pathname) => pathname.startsWith("/byes"),
  },
];

const WATCHLIST_NAV_ITEM: NavItem = {
  href: "/watchlist",
  label: "Watchlist",
  isActive: (pathname) => pathname.startsWith("/watchlist"),
};

export default function DesktopNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasLiveMatch = useLiveCacheIndicator();
  const returnTo = searchParams.get("returnTo");

  const teamContextOnPlayer =
    pathname.startsWith("/players/") && !!returnTo && /^\/teams\/\d+$/.test(returnTo);

  return (
    <nav className="brand-nav-shell fixed inset-x-0 top-0 z-40 hidden border-b md:block">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between lg:h-20">
          <div className="flex items-center gap-8 lg:gap-10">
            <Link
              href="/"
              className="brand-nav-title text-xl font-bold text-accent-light lg:text-2xl"
            >
              Footy Break Evens
            </Link>
            <div className="flex gap-2 lg:gap-3">
              {PRIMARY_NAV_ITEMS.map((item) => {
                const active =
                  item.href === "/teams"
                    ? item.isActive(pathname) || teamContextOnPlayer
                    : item.href === "/players/search"
                      ? item.isActive(pathname) && !teamContextOnPlayer
                      : item.isActive(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`brand-nav-link rounded-md px-3 py-1.5 text-sm transition-colors lg:text-base ${
                      active
                        ? "brand-nav-link-active bg-accent-light/15 text-accent-light"
                        : "brand-nav-link-inactive text-muted hover:text-accent-light"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span>{item.label}</span>
                      {item.href === "/live" && hasLiveMatch && (
                        <span
                          aria-label="Live matches"
                          className="h-2 w-2 rounded-full bg-danger"
                        />
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href={WATCHLIST_NAV_ITEM.href}
              aria-current={
                WATCHLIST_NAV_ITEM.isActive(pathname) ? "page" : undefined
              }
              className={`brand-nav-watch rounded-md border px-3 py-1.5 text-sm transition-colors lg:text-base ${
                WATCHLIST_NAV_ITEM.isActive(pathname)
                  ? "brand-nav-watch-active border-accent-light/40 bg-accent-light/15 text-accent-light"
                  : "brand-nav-watch-inactive border-border text-muted hover:text-accent-light"
              }`}
            >
              {WATCHLIST_NAV_ITEM.label}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
