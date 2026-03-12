"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import type { PlayerInfo } from "@nrl/types";
import { PositionBadge } from "@/components/position-badge";
import { StatusBadge } from "@/components/status-badge";
import { useWatchlistPlayers } from "@/hooks/use-player-storage";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { teamPath } from "@/lib/entity-routes";
import { formatPrice } from "@/lib/utils";

interface PlayerHeaderProps {
  player: PlayerInfo;
  avgPoints: string | null;
}

export function PlayerHeader({ player, avgPoints }: PlayerHeaderProps) {
  const { playerIds: watchlistIds, togglePlayer } = useWatchlistPlayers();
  const isWatchlisted = watchlistIds.has(player.playerId);

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <PlayerAvatar playerId={player.playerId} name={player.fullName} size="lg" />
          <div className="hidden md:block">
            <h1 className="text-3xl font-bold">{player.fullName}</h1>
            <Link
              href={teamPath(player.squadId, player.squad.shortName ?? player.squad.name)}
              className="mt-1 text-accent-light hover:underline"
            >
              {player.squad.name}
            </Link>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() =>
              togglePlayer({
                playerId: player.playerId,
                fullName: player.fullName,
                squadName: player.squad.shortName ?? player.squad.name,
                positions: player.positions,
                status: player.status,
                cost: player.cost,
                avgPoints,
              })
            }
            aria-label={
              isWatchlisted
                ? `Remove ${player.fullName} from watchlist`
                : `Add ${player.fullName} to watchlist`
            }
            className={`mt-0.5 rounded p-1 transition-colors ${
              isWatchlisted
                ? "text-amber-300 hover:text-amber-200"
                : "text-muted hover:text-amber-300"
            }`}
          >
            <Star className={`h-5 w-5 ${isWatchlisted ? "fill-current" : ""}`} />
          </button>
          <div className="text-right">
            <div className="text-2xl font-bold">{formatPrice(player.cost)}</div>
            {player.status && (
              <div className="mt-1">
                <StatusBadge status={player.status} showLabel />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2 md:hidden">
        <h1 className="break-words text-2xl font-bold leading-tight">{player.fullName}</h1>
        <div className="flex items-start justify-between gap-3">
          <Link
            href={teamPath(player.squadId, player.squad.shortName ?? player.squad.name)}
            className="text-accent-light hover:underline"
          >
            {player.squad.name}
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <PositionBadge positions={player.positions} />
            {player.locked && (
              <span className="rounded bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger">
                Locked
              </span>
            )}
            {player.isBye && (
              <span className="rounded bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                Bye
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 hidden items-center gap-4 md:flex">
        <PositionBadge positions={player.positions} />
        {player.locked && (
          <span className="rounded bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger">
            Locked
          </span>
        )}
        {player.isBye && (
          <span className="rounded bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
            Bye
          </span>
        )}
      </div>
    </div>
  );
}
