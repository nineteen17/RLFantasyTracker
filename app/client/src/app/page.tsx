import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-12">
      <div className="text-center">
        <h1 className="text-5xl font-bold">Become an NRL Fantasy Expert</h1>
        <h2 className="mt-4 text-xl text-muted">
          Player stats, value metrics, break evens and live fantasy scores
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/players/search"
          className="rounded-lg border border-border bg-surface p-8 transition hover:border-border-hover hover:shadow-lg hover:shadow-accent/10"
        >
          <h2 className="text-2xl font-bold">Search Players</h2>
          <p className="mt-2 text-muted">
            Find players by name, team, or position with advanced filters
          </p>
        </Link>

        <Link
          href="/teams"
          className="rounded-lg border border-border bg-surface p-8 transition hover:border-border-hover hover:shadow-lg hover:shadow-accent/10"
        >
          <h2 className="text-2xl font-bold">Browse Teams</h2>
          <p className="mt-2 text-muted">
            View team rosters and fixture schedules
          </p>
        </Link>

        <Link
          href="/live"
          className="rounded-lg border border-border bg-surface p-8 transition hover:border-border-hover hover:shadow-lg hover:shadow-accent/10"
        >
          <h2 className="text-2xl font-bold">Live Matches</h2>
          <p className="mt-2 text-muted">
            Live scores and player fantasy stats for the current round
          </p>
        </Link>

        <div className="rounded-lg border border-border bg-surface-alt p-8">
          <h2 className="text-2xl font-bold">Key Features</h2>
          <ul className="mt-2 space-y-1 text-muted">
            <li>• Value scores & PPM metrics</li>
            <li>• Break evens & projections</li>
            <li>• Ownership & captain stats</li>
            <li>• Opponent & venue splits</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
