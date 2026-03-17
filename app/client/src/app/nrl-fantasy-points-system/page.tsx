import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "NRL Fantasy Points System",
  description:
    "Understand how NRL Fantasy scoring works, what stats drive points, and how to use scoring context for better captaincy and trade decisions.",
  alternates: {
    canonical: "/nrl-fantasy-points-system",
  },
};

export default function NrlFantasyPointsSystemPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">NRL Fantasy Points System</h1>
        <p className="text-sm leading-6 text-muted">
          A practical guide to how fantasy scores are created and how to use
          that scoring context in your weekly decisions.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">How Scoring Is Built</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          A player&apos;s final score is the sum of positive contributions and
          negative events. In practice, scoring usually comes from a mix of
          base work rate, attacking involvement, and discipline/error profile.
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-muted">
          <li>Base output: consistent involvement and repeat effort stats.</li>
          <li>Attack upside: events like tries, assists, and line involvement.</li>
          <li>Negative events: errors, missed defensive actions, and penalties.</li>
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">What Usually Predicts Better Scores</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
          <li>Role stability and secure minutes.</li>
          <li>Higher involvement through middle or dominant playmaker roles.</li>
          <li>Set-piece and goal-kicking opportunity where relevant.</li>
          <li>Strong matchup context and game script fit.</li>
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">How to Use This in Team Decisions</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted">
          <li>Start with role and minutes certainty.</li>
          <li>Check recent scoring profile versus long-run average.</li>
          <li>Compare upside players by volatility and matchup quality.</li>
          <li>Use captaincy on players with high floor plus ceiling path.</li>
        </ol>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Important Note on Official Rules</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Exact scoring event weights can be updated by official competition
          operators between seasons. Always confirm official rules for your
          current season before final decisions.
        </p>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Related Tools</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link
            href="/players/search"
            className="rounded-md border border-border px-3 py-1.5 text-muted transition-colors hover:text-accent-light hover:underline"
          >
            Player Search
          </Link>
          <Link
            href="/players"
            className="rounded-md border border-border px-3 py-1.5 text-muted transition-colors hover:text-accent-light hover:underline"
          >
            Player Index
          </Link>
          <Link
            href="/nrl-fantasy-breakevens"
            className="rounded-md border border-border px-3 py-1.5 text-muted transition-colors hover:text-accent-light hover:underline"
          >
            Breakevens Guide
          </Link>
        </div>
      </section>
    </div>
  );
}
