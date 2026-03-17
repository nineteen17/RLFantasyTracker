import type { Metadata } from "next";
import Link from "next/link";
import { apiFetchServer } from "@/lib/api-server";
import { playerPath } from "@/lib/entity-routes";
import { ErrorState } from "@/components/ui/error-state";

type PlayerIndexResponse = {
  data: Array<{
    playerId: number;
    fullName: string;
    squadShortName: string | null;
    squadName: string | null;
  }>;
  limit: number;
  offset: number;
};

type PlayerIndexEntry = {
  playerId: number;
  fullName: string;
  squadShortName: string | null;
  squadName: string | null;
};

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "NRL Player Index",
  description: "Browse all NRL Fantasy player profiles in one index page.",
  alternates: {
    canonical: "/players",
  },
};

function toGroupKey(fullName: string): string {
  const first = fullName.trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : "#";
}

async function fetchPlayerIndex(): Promise<PlayerIndexEntry[]> {
  const limit = 100;
  const maxPages = 25;
  const players: PlayerIndexEntry[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * limit;
    const path = `/api/players/search?limit=${limit}&offset=${offset}&sort=avg_points&order=desc`;
    const payload = await apiFetchServer<PlayerIndexResponse>(path, {
      next: { revalidate },
    });

    if (!payload?.data?.length) break;
    players.push(...payload.data);
    if (payload.data.length < limit) break;
  }

  const unique = new Map<number, PlayerIndexEntry>();
  for (const player of players) {
    if (!unique.has(player.playerId)) unique.set(player.playerId, player);
  }

  return [...unique.values()].sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export default async function PlayersIndexPage() {
  let players: PlayerIndexEntry[] = [];
  try {
    players = await fetchPlayerIndex();
  } catch {
    return <ErrorState message="Unable to load the player index right now." />;
  }

  const grouped = new Map<string, PlayerIndexEntry[]>();
  for (const player of players) {
    const key = toGroupKey(player.fullName);
    const list = grouped.get(key) ?? [];
    list.push(player);
    grouped.set(key, list);
  }

  const keys = [...grouped.keys()].sort((a, b) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Player Index</h1>
          <p className="mt-2 text-muted">
            Browse all player profiles. Total players: {players.length}
          </p>
        </div>
        <Link
          href="/players/search"
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          Advanced Search
        </Link>
      </div>

      <div className="grid gap-6">
        {keys.map((key) => (
          <section key={key} className="rounded-lg border border-border bg-surface p-4 sm:p-5">
            <h2 className="mb-3 text-xl font-semibold">{key}</h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(grouped.get(key) ?? []).map((player) => (
                <li key={player.playerId}>
                  <Link
                    href={playerPath(player.playerId, player.fullName)}
                    className="inline-flex max-w-full items-center gap-1.5 text-sm text-accent-light hover:underline"
                  >
                    <span className="truncate">{player.fullName}</span>
                    <span className="shrink-0 text-muted">
                      ({player.squadShortName ?? player.squadName ?? "NRL"})
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
