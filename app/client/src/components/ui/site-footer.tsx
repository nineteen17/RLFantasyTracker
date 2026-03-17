"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function currentYear(): number {
  return new Date().getFullYear();
}

const EXPLORE_LINKS = [
  { href: "/teams", label: "Teams" },
  { href: "/live", label: "Live Matches" },
  { href: "/byes", label: "Bye Planner" },
];

const TOOLS_LINKS = [
  { href: "/nrl-fantasy-points-system", label: "Points System" },
  { href: "/nrl-fantasy-breakevens", label: "Breakevens Guide" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/players", label: "All Players" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
];

const COMPACT_LINKS = [
  { href: "/nrl-fantasy-points-system", label: "Points System" },
  { href: "/nrl-fantasy-breakevens", label: "Breakevens" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

function CompactFooter() {
  return (
    <footer className="border-t border-border/80 bg-surface/60">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2 px-4 py-4 text-xs text-muted/70 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {COMPACT_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-accent-light hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <p className="text-center">© {currentYear()} Footy Break Evens</p>
      </div>
    </footer>
  );
}

function FullFooter() {
  return (
    <footer className="border-t border-border/80 bg-surface/60">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="text-center sm:col-span-2 lg:col-span-1 lg:text-left">
            <Link href="/" className="text-lg font-bold text-accent-light">
              Footy Break Evens
            </Link>
            <p className="mt-2 text-sm text-muted">
              Not associated with, endorsed by, or affiliated with NRL, NRL
              Fantasy, or the National Rugby League.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted/70">
              Explore
            </h3>
            <ul className="mt-3 space-y-2">
              {EXPLORE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted transition-colors hover:text-accent-light"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tools */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted/70">
              Tools
            </h3>
            <ul className="mt-3 space-y-2">
              {TOOLS_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted transition-colors hover:text-accent-light"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted/70">
              Legal
            </h3>
            <ul className="mt-3 space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted transition-colors hover:text-accent-light"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-border/60 pt-6 text-center">
          <p className="text-xs text-muted/70">
            © {currentYear()} Footy Break Evens
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function SiteFooter() {
  const pathname = usePathname();
  return pathname === "/" ? <FullFooter /> : <CompactFooter />;
}
