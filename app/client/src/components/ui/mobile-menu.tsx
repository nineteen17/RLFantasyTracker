"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu, X } from "lucide-react";
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

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasLiveMatch = useLiveCacheIndicator();
  const returnTo = searchParams.get("returnTo");

  const teamContextOnPlayer =
    pathname.startsWith("/players/") && !!returnTo && /^\/teams\/\d+$/.test(returnTo);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="md:hidden">
      <div className="brand-nav-shell fixed inset-x-0 top-0 z-50 border-b">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6">
          <Link href="/" className="brand-nav-title text-xl font-bold text-accent-light">
            Footy Break Evens
          </Link>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <button
              onClick={toggleMenu}
              className="brand-nav-icon-button rounded-md p-2 text-muted transition-colors hover:text-accent-light"
              aria-label="Open menu"
            >
              <Menu />
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[60] bg-bg/98 backdrop-blur">
          <div className="h-full w-full">
            <div className="brand-nav-shell flex h-16 items-center justify-between border-b px-4 sm:px-6">
              <h2 className="brand-nav-title text-xl font-bold text-accent-light">
                Footy Break Evens
              </h2>
              <div className="flex items-center gap-1.5">
                <ThemeToggle />
                <button
                  onClick={toggleMenu}
                  className="brand-nav-icon-button rounded-md p-2 text-muted transition-colors hover:text-accent-light"
                  aria-label="Close menu"
                >
                  <X />
                </button>
              </div>
            </div>

            <nav className="mt-4 flex flex-col gap-1 px-4 sm:px-6" onClick={toggleMenu}>
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
                    prefetch={false}
                    aria-current={active ? "page" : undefined}
                    className={`brand-nav-link rounded-md px-3 py-2 text-base transition-colors ${
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
              <div className="brand-nav-separator my-2 border-t border-border/70" />
              <Link
                href={WATCHLIST_NAV_ITEM.href}
                prefetch={false}
                aria-current={
                  WATCHLIST_NAV_ITEM.isActive(pathname) ? "page" : undefined
                }
                className={`brand-nav-watch rounded-md border px-3 py-2 text-base transition-colors ${
                  WATCHLIST_NAV_ITEM.isActive(pathname)
                    ? "brand-nav-watch-active border-accent-light/40 bg-accent-light/15 text-accent-light"
                    : "brand-nav-watch-inactive border-border text-muted hover:text-accent-light"
                }`}
              >
                {WATCHLIST_NAV_ITEM.label}
              </Link>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
