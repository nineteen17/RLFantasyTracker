"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { POSITION_LABELS } from "@/lib/constants";
import { useWatchlistPlayers } from "@/hooks/use-player-storage";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { formatNumber, formatPrice } from "@/lib/utils";

function positionLabel(positions: number[]): string {
  return positions.map((p) => POSITION_LABELS[p] ?? p).join("/");
}

const TEAM_NAME_BY_CODE: Record<string, string> = {
  BRI: "Broncos",
  CAN: "Raiders",
  CBY: "Bulldogs",
  CRO: "Sharks",
  DOL: "Dolphins",
  GLD: "Titans",
  MAN: "Sea Eagles",
  MEL: "Storm",
  NEW: "Knights",
  NQL: "Cowboys",
  PAR: "Eels",
  PEN: "Panthers",
  SOU: "Rabbitohs",
  STG: "Dragons",
  SYD: "Roosters",
  WAR: "Warriors",
  WST: "Tigers",
};

function formatTeamLabel(teamName: string | null): string {
  if (!teamName) return "-";
  const trimmed = teamName.trim();
  if (!trimmed) return "-";
  return TEAM_NAME_BY_CODE[trimmed.toUpperCase()] ?? trimmed;
}

const TEAM_CODE_BY_NAME = Object.fromEntries(
  Object.entries(TEAM_NAME_BY_CODE).map(([code, name]) => [name.toLowerCase(), code]),
);

function formatMobileTeamLabel(teamName: string | null): string {
  if (!teamName) return "-";
  const trimmed = teamName.trim();
  if (!trimmed) return "-";

  const upper = trimmed.toUpperCase();
  if (TEAM_NAME_BY_CODE[upper]) return upper;

  const code = TEAM_CODE_BY_NAME[trimmed.toLowerCase()];
  if (code) return code;

  return upper.slice(0, 3);
}

function MobileWatchlistSkeleton() {
  return (
    <div className="space-y-3 md:hidden">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="rounded-lg border border-border bg-surface p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="min-w-0 space-y-1.5">
                <Skeleton className="h-4 w-32 max-w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-4 rounded" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DesktopWatchlistSkeleton() {
  return (
    <div className="hidden rounded-lg border border-border md:block">
      <table className="w-full table-fixed text-sm md:text-base">
        <colgroup>
          <col className="w-[42%]" />
          <col className="w-[20%]" />
          <col className="w-[12%]" />
          <col className="w-[16%]" />
          <col className="w-[10%]" />
        </colgroup>
        <thead className="bg-surface-alt">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted md:text-base">
              Player
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted">Team</th>
            <th className="px-4 py-3 text-right font-medium text-muted">Avg</th>
            <th className="px-4 py-3 text-center font-medium text-muted">Status</th>
            <th className="px-4 py-3 text-center font-medium text-muted">Watch</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, idx) => (
            <tr key={idx}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-36 max-w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end">
                  <Skeleton className="h-4 w-12" />
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-center">
                  <Skeleton className="h-4 w-16" />
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-center">
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function WatchlistPage() {
  const { players, playerIds, togglePlayer, clear } = useWatchlistPlayers();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const visiblePlayers = hydrated ? players : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Watchlist</h1>
          <p className="mt-2 text-muted">
            Tracked players stored on this device.
          </p>
        </div>
        {visiblePlayers.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:text-foreground"
          >
            Clear Watchlist
          </button>
        )}
      </div>

      {!hydrated ? (
        <>
          <MobileWatchlistSkeleton />
          <DesktopWatchlistSkeleton />
        </>
      ) : visiblePlayers.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted md:text-base">
          Watchlist is empty. Add players from{" "}
          <Link
            href="/players/search"
            className="text-accent-light hover:underline"
          >
            Player Search
          </Link>
          .
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {visiblePlayers.map((player) => (
              <div
                key={player.playerId}
                className="rounded-lg border border-border bg-surface p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <PlayerAvatar
                      playerId={player.playerId}
                      name={player.fullName}
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/players/${player.playerId}?returnTo=%2Fwatchlist`}
                        className="block line-clamp-2 text-sm font-medium leading-tight text-accent-light hover:underline"
                      >
                        {player.fullName}
                      </Link>
                      <div className="mt-0.5 text-xs text-muted">
                        {positionLabel(player.positions)} | {formatPrice(player.cost)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePlayer(player)}
                    aria-label={
                      playerIds.has(player.playerId)
                        ? `Remove ${player.fullName} from watchlist`
                        : `Add ${player.fullName} to watchlist`
                    }
                    className={`inline-flex rounded p-0.5 transition-colors ${
                      playerIds.has(player.playerId)
                        ? "text-amber-300 hover:text-amber-200"
                        : "text-muted hover:text-amber-300"
                    }`}
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${
                        playerIds.has(player.playerId) ? "fill-current" : ""
                      }`}
                    />
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-md border border-border bg-surface-alt px-2.5 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted">
                      Team
                    </div>
                    <div className="mt-0.5 truncate text-sm font-medium">
                      {formatMobileTeamLabel(player.squadName)}
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-surface-alt px-2.5 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted">Avg</div>
                    <div className="mt-0.5 text-sm font-medium tabular-nums">
                      {formatNumber(player.avgPoints)}
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-surface-alt px-2.5 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted">
                      Status
                    </div>
                    <div className="mt-0.5 text-sm font-medium">
                      {player.status ? <StatusBadge status={player.status} /> : "-"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden rounded-lg border border-border md:block">
            <table className="w-full table-fixed text-sm md:text-base">
              <colgroup>
                <col className="w-[42%]" />
                <col className="w-[20%]" />
                <col className="w-[12%]" />
                <col className="w-[16%]" />
                <col className="w-[10%]" />
              </colgroup>
            <thead className="bg-surface-alt">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted md:text-base">
                  Player
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted">
                  Team
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted">
                  Avg
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted">
                  Watch
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visiblePlayers.map((player) => (
                <tr
                  key={player.playerId}
                  className="group/row hover:bg-surface-alt"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs md:text-sm">
                      <PlayerAvatar
                        playerId={player.playerId}
                        name={player.fullName}
                      />
                      <div className="min-w-0 text-left">
                        <Link
                          href={`/players/${player.playerId}?returnTo=%2Fwatchlist`}
                          className="block line-clamp-2 font-medium leading-tight text-accent-light hover:underline"
                        >
                          {player.fullName}
                        </Link>
                        <div className="mt-0.5 text-xs text-muted md:text-sm">
                          {positionLabel(player.positions)} |{" "}
                          {formatPrice(player.cost)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {formatTeamLabel(player.squadName)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatNumber(player.avgPoints)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    {player.status ? (
                      <StatusBadge status={player.status} showLabel />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        togglePlayer(player);
                      }}
                      aria-label={
                        playerIds.has(player.playerId)
                          ? `Remove ${player.fullName} from watchlist`
                          : `Add ${player.fullName} to watchlist`
                      }
                      className={`inline-flex rounded p-0.5 transition-colors ${
                        playerIds.has(player.playerId)
                          ? "text-amber-300 hover:text-amber-200"
                          : "text-muted hover:text-amber-300"
                      }`}
                    >
                      <Star
                        className={`h-3.5 w-3.5 ${
                          playerIds.has(player.playerId) ? "fill-current" : ""
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
