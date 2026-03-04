"use client";

import Link from "next/link";
import { POSITION_LABELS } from "@/lib/constants";
import { useWatchlistPlayers } from "@/hooks/use-player-storage";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { StatusBadge } from "@/components/status-badge";
import { formatNumber, formatPrice } from "@/lib/utils";

function positionLabel(positions: number[]): string {
  return positions.map((p) => POSITION_LABELS[p] ?? p).join("/");
}

export default function WatchlistPage() {
  const { players, removePlayer, clear } = useWatchlistPlayers();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Watchlist</h1>
          <p className="mt-2 text-muted">Tracked players stored on this device.</p>
        </div>
        {players.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:text-foreground"
          >
            Clear Watchlist
          </button>
        )}
      </div>

      {players.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted md:text-base">
          Watchlist is empty. Add players from{" "}
          <Link href="/players/search" className="text-accent-light hover:underline">
            Player Search
          </Link>
          .
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm md:text-base">
            <thead className="bg-surface-alt">
              <tr>
                <th className="px-3 py-3 text-left font-medium text-muted">Player</th>
                <th className="px-3 py-3 text-left font-medium text-muted">Team</th>
                <th className="px-3 py-3 text-left font-medium text-muted">Pos</th>
                <th className="px-3 py-3 text-right font-medium text-muted">Price</th>
                <th className="px-3 py-3 text-right font-medium text-muted">Avg</th>
                <th className="px-3 py-3 text-left font-medium text-muted">Status</th>
                <th className="px-3 py-3 text-right font-medium text-muted">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {players.map((player) => (
                <tr key={player.playerId} className="hover:bg-surface-alt/30">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <PlayerAvatar playerId={player.playerId} name={player.fullName} />
                      <Link
                        href={`/players/${player.playerId}`}
                        className="font-medium text-accent-light hover:underline"
                      >
                        {player.fullName}
                      </Link>
                    </div>
                  </td>
                  <td className="px-3 py-2">{player.squadName ?? "-"}</td>
                  <td className="px-3 py-2">{positionLabel(player.positions)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPrice(player.cost)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatNumber(player.avgPoints)}
                  </td>
                  <td className="px-3 py-2">
                    {player.status ? <StatusBadge status={player.status} /> : "-"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removePlayer(player.playerId)}
                      className="rounded border border-border px-2 py-1 text-xs text-muted transition-colors hover:text-foreground md:text-sm"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
