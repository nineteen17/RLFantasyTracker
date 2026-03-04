"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import type { SearchResult, SearchQuery } from "@nrl/types";
import { POSITION_LABELS } from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { useWatchlistPlayers } from "@/hooks/use-player-storage";
import {
  formatPrice,
  formatNumber,
  formatPercent,
} from "@/lib/utils";

type SortField = SearchQuery["sort"];

interface PlayerTableProps {
  players: SearchResult[];
  sort: string;
  order: string;
  onSort: (updates: Partial<SearchQuery>) => void;
}

const SORTABLE_COLUMNS: { field: SortField; label: string }[] = [
  { field: "avg_points", label: "Avg" },
  { field: "price", label: "Price" },
  { field: "break_evens", label: "BE" },
  { field: "base_avg", label: "Base" },
  // { field: "owned_by", label: "Own%" },
  { field: "ppm_season", label: "PPM" },
];

function getNextBreakEven(player: SearchResult): number | null {
  const breakEvens = player.breakEvens as Record<string, unknown> | null;
  if (!breakEvens || typeof breakEvens !== "object") return null;

  const nextRound = Object.keys(breakEvens)
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b)[0];

  if (nextRound === undefined) return null;

  const raw = breakEvens[String(nextRound)];
  if (raw === null || raw === undefined) return null;

  const value = typeof raw === "string" ? Number.parseFloat(raw) : Number(raw);
  return Number.isFinite(value) ? value : null;
}

const SORT_FIELD_GETTER: Record<string, (p: SearchResult) => string> = {
  avg_points: (p) => formatNumber(p.avgPoints),
  price: (p) => formatPrice(p.cost),
  break_evens: (p) => {
    const be = getNextBreakEven(p);
    if (be === null) return "-";
    return Number.isInteger(be) ? String(be) : be.toFixed(1);
  },
  base_avg: (p) => formatNumber(p.baseAvg),
  owned_by: (p) => formatPercent(p.ownedBy),
  ppm_season: (p) => formatNumber(p.ppmSeason),
};

function SortIndicator({ active, order }: { active: boolean; order: string }) {
  if (!active) return <span className="ml-1 text-muted/30">↕</span>;
  return <span className="ml-1">{order === "asc" ? "↑" : "↓"}</span>;
}

function positionLabel(positions: number[]): string {
  return positions.map((p) => POSITION_LABELS[p] ?? p).join("/");
}

export function PlayerTable({
  players,
  sort,
  order,
  onSort,
}: PlayerTableProps) {
  const { playerIds: watchlistIds, togglePlayer: toggleWatchlistPlayer } =
    useWatchlistPlayers();

  const handleSort = (field: SortField) => {
    if (sort === field) {
      onSort({ order: order === "asc" ? "desc" : "asc" });
    } else {
      onSort({ sort: field, order: "desc" });
    }
  };

  if (players.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center text-muted">
        No players found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full w-max text-sm md:text-base">
        <thead className="bg-surface-alt">
          <tr>
            <th className="relative sticky left-0 z-20 min-w-[176px] bg-surface-alt px-3 py-3 text-left text-sm font-medium text-muted after:absolute after:top-0 after:right-0 after:bottom-0 after:w-px after:bg-border md:min-w-[204px] md:px-4 md:text-base">
              Player
            </th>
            {SORTABLE_COLUMNS.map((col) => (
              <th
                key={col.field}
                onClick={() => handleSort(col.field)}
                className={`cursor-pointer select-none whitespace-nowrap px-2 py-3 text-right text-xs font-medium transition-colors hover:text-inherit md:min-w-[72px] md:px-3 md:text-sm ${sort === col.field ? "text-accent-light" : "text-muted"}`}
              >
                {col.label}
                <SortIndicator active={sort === col.field} order={order} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {players.map((player) => (
            <tr
              key={player.playerId}
              className="group/row hover:bg-surface-alt"
            >
              <td className="relative sticky left-0 z-10 min-w-[176px] bg-bg px-0 py-2 after:absolute after:top-0 after:right-0 after:bottom-0 after:w-px after:bg-border group-hover/row:bg-surface-alt md:min-w-[204px]">
                <div className="flex items-center gap-1.5 text-xs md:text-sm">
                  <PlayerAvatar
                    playerId={player.playerId}
                    name={player.fullName}
                  />
                  <div className="min-w-0 pr-3 md:pr-4">
                    <div className="flex items-center gap-1.5">
                      {player.status && <StatusBadge status={player.status} />}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          toggleWatchlistPlayer(player);
                        }}
                        aria-label={
                          watchlistIds.has(player.playerId)
                            ? `Remove ${player.fullName} from watchlist`
                            : `Add ${player.fullName} to watchlist`
                        }
                        className={`rounded p-0.5 transition-colors ${
                          watchlistIds.has(player.playerId)
                            ? "text-amber-300 hover:text-amber-200"
                            : "text-muted hover:text-amber-300"
                        }`}
                      >
                        <Star
                          className={`h-3.5 w-3.5 ${
                            watchlistIds.has(player.playerId) ? "fill-current" : ""
                          }`}
                        />
                      </button>
                      <Link
                        href={`/players/${player.playerId}?from=search`}
                        className="line-clamp-2 font-medium leading-tight text-accent-light hover:underline"
                      >
                        {player.fullName}
                      </Link>
                    </div>
                    <div className="mt-0.5 text-xs text-muted md:text-sm">
                      {positionLabel(player.positions)} |{" "}
                      {formatPrice(player.cost)}
                    </div>
                  </div>
                </div>
              </td>
              {SORTABLE_COLUMNS.map((col) => (
                <td
                  key={col.field}
                  className={`whitespace-nowrap px-2 py-2 text-right text-sm md:min-w-[72px] md:px-3 md:text-base ${sort === col.field ? "font-medium text-accent-light" : ""}`}
                >
                  {SORT_FIELD_GETTER[col.field](player)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
