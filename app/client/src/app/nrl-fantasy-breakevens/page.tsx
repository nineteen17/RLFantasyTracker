import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "NRL Fantasy Breakevens Explained",
  description:
    "Learn what breakevens mean in NRL Fantasy, how to use them for trade timing, and how to balance value versus points.",
  alternates: {
    canonical: "/nrl-fantasy-breakevens",
  },
};

export default function NrlFantasyBreakevensPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">NRL Fantasy Breakevens</h1>
        <p className="text-sm leading-6 text-muted">
          Breakeven is a practical price-change signal. Use it with role,
          minutes, and matchup context instead of in isolation.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">What a Breakeven Means</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          A breakeven is the approximate score a player needs in the current
          round to hold price. If a player scores above their breakeven, price
          usually trends up. If they score below it, price pressure is typically
          downward.
        </p>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">How to Interpret It Correctly</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
          <li>Very low breakeven: strong short-term value growth signal.</li>
          <li>Very high breakeven: higher risk of price drop if output cools.</li>
          <li>Neutral breakeven: price likely stable unless role changes.</li>
          <li>Always cross-check with minutes, role, and fixture context.</li>
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Trade Framework</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted">
          <li>Identify players with role growth and favorable breakevens.</li>
          <li>Prioritize points and job security over pure price chasing.</li>
          <li>Sell players whose breakeven is high and role is weakening.</li>
          <li>Protect captaincy options and team structure while trading.</li>
        </ol>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Common Mistakes</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
          <li>Trading only for cash generation and ignoring points.</li>
          <li>Ignoring role volatility after one spike score.</li>
          <li>Holding a declining role because of past averages.</li>
          <li>Forcing trades before team list clarity.</li>
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Use Live Data</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Breakevens update alongside current performance and role signals. Use
          current data views to validate every trade decision each round.
        </p>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Related Tools</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link
            href="/players/search?sort=break_evens&order=asc"
            className="rounded-md border border-border px-3 py-1.5 text-muted transition-colors hover:text-accent-light hover:underline"
          >
            Lowest Breakevens
          </Link>
          <Link
            href="/players/search?sort=break_evens&order=desc"
            className="rounded-md border border-border px-3 py-1.5 text-muted transition-colors hover:text-accent-light hover:underline"
          >
            Highest Breakevens
          </Link>
          <Link
            href="/players"
            className="rounded-md border border-border px-3 py-1.5 text-muted transition-colors hover:text-accent-light hover:underline"
          >
            Player Index
          </Link>
          <Link
            href="/nrl-fantasy-points-system"
            className="rounded-md border border-border px-3 py-1.5 text-muted transition-colors hover:text-accent-light hover:underline"
          >
            Points System Guide
          </Link>
        </div>
      </section>
    </div>
  );
}
