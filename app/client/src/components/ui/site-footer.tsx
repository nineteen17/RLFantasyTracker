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
    <footer className="home-footer">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Brand */}
        <div className="mb-6 sm:mb-8">
          <Link href="/" className="text-lg font-bold text-accent-light">
            Footy Break Evens
          </Link>
          <p className="mt-1.5 max-w-sm text-xs text-muted/60 sm:text-sm">
            Not associated with, endorsed by, or affiliated with NRL, NRL
            Fantasy, or the National Rugby League.
          </p>
        </div>

        {/* Link columns — always 3-across, even on mobile */}
        <div className="grid grid-cols-3 gap-4 sm:gap-8">
          {[
            { title: "Explore", links: EXPLORE_LINKS },
            { title: "Tools", links: TOOLS_LINKS },
            { title: "Legal", links: LEGAL_LINKS },
          ].map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted/60">
                {group.title}
              </h3>
              <ul className="mt-2 space-y-1.5 sm:mt-3 sm:space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-muted transition-colors hover:text-accent-light sm:text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
