"use client";

import { useState } from "react";
import Link from "next/link";
import type { LivePlayerStat } from "@nrl/types";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { ALL_STATS, statFantasyPoints } from "@/lib/stat-labels";
import { Skeleton } from "@/components/ui/skeleton";

interface MatchStatsPanelProps {
  homeSquadName: string;
  awaySquadName: string;
  homePlayers: LivePlayerStat[];
  awayPlayers: LivePlayerStat[];
  isLoading?: boolean;
}

function formatCompactPlayerName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return fullName;
  const firstInitial = parts[0].charAt(0).toUpperCase();
  const surname = parts[parts.length - 1];
  return `${firstInitial}.${surname}`;
}

export function MatchStatsPanel({
  homeSquadName,
  awaySquadName,
  homePlayers,
  awayPlayers,
  isLoading = false,
}: MatchStatsPanelProps) {
  const [selectedTeam, setSelectedTeam] = useState<"home" | "away">("home");

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (homePlayers.length === 0 && awayPlayers.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted md:text-base">
        No stats available yet
      </div>
    );
  }

  const selectedTeamName =
    selectedTeam === "home" ? homeSquadName : awaySquadName;
  const selectedPlayers = selectedTeam === "home" ? homePlayers : awayPlayers;

  return (
    <div>
      <div className="border-b border-border/70 px-4 py-3 md:px-6 md:py-4">
        <div className="mx-auto w-full max-w-2xl">
          <div className="grid grid-cols-2 gap-2 rounded-full border border-border bg-surface-alt p-1 text-sm">
            <button
              type="button"
              onClick={() => setSelectedTeam("home")}
              className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                selectedTeam === "home"
                  ? "bg-accent/15 text-accent-light"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {homeSquadName}
            </button>
            <button
              type="button"
              onClick={() => setSelectedTeam("away")}
              className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                selectedTeam === "away"
                  ? "bg-accent/15 text-accent-light"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {awaySquadName}
            </button>
          </div>
        </div>
      </div>

      <TeamStatsTable teamName={selectedTeamName} players={selectedPlayers} />
    </div>
  );
}

function StatCell({ statKey, value }: { statKey: string; value: number }) {
  const pts = statFantasyPoints(statKey, value);

  if (value === 0) {
    return (
      <td className="py-1.5 px-1.5 tabular-nums text-muted/30">
        <div className="flex flex-col items-center">
          <span>0</span>
          <span className="text-[10px] md:text-xs">-</span>
        </div>
      </td>
    );
  }

  return (
    <td className="py-1.5 px-1.5 tabular-nums">
      <div className="flex flex-col items-center">
        <span>{value}</span>
        <span
          className={`text-[10px] md:text-xs ${pts !== 0 ? (pts > 0 ? "text-green-400" : "text-red-400") : "text-muted/30"}`}
        >
          {pts !== 0 ? `(${Math.abs(pts)})` : "-"}
        </span>
      </div>
    </td>
  );
}

function TeamStatsTable({
  teamName,
  players,
}: {
  teamName: string;
  players: LivePlayerStat[];
}) {
  if (players.length === 0) return null;

  const sorted = [...players].sort((a, b) => b.points - a.points);

  return (
    <div className="p-4">
      <h3 className="mb-2 text-sm font-semibold text-accent-light md:text-base">
        {teamName}
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-max table-fixed text-sm md:text-base">
          <colgroup>
            <col className="w-[140px] md:w-[280px]" />
            <col className="w-14 md:w-16" />
            <col className="w-14 md:w-16" />
            {ALL_STATS.map((s) => (
              <col key={`col-${s.key}`} className="w-14 md:w-16" />
            ))}
          </colgroup>
          <thead>
            <tr className="text-xs text-muted md:text-sm">
              <th className="pb-2 text-left font-medium sticky left-0 bg-surface z-10">
                Player
              </th>
              <th className="pb-2 px-1.5 text-center font-medium text-accent-light">
                PTS
              </th>
              <th
                className="pb-2 px-1.5 text-center font-medium"
                title="Minutes Played"
              >
                MP
              </th>
              {ALL_STATS.map((s) => (
                <th
                  key={s.key}
                  className="pb-2 px-1.5 text-center font-medium"
                  title={s.full}
                >
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((player) => {
              const stats = player.stats as Record<string, number>;
              return (
                <tr
                  key={player.playerId}
                  className="border-t border-border/50 hover:bg-surface-alt/30"
                >
                  <td className="py-2.5 pr-2 whitespace-nowrap sticky left-0 bg-surface z-10 md:pr-10">
                    <div className="flex items-center gap-1 text-xs md:gap-2 md:text-sm">
                      <PlayerAvatar
                        playerId={player.playerId}
                        name={player.fullName}
                        className="h-7 w-7 md:h-8 md:w-8"
                      />
                      <Link
                        href={`/players/${player.playerId}`}
                        className="max-w-[82px] truncate text-xs text-accent-light hover:underline md:max-w-none md:text-sm"
                      >
                        <span className="md:hidden">
                          {formatCompactPlayerName(player.fullName)}
                        </span>
                        <span className="hidden md:inline">{player.fullName}</span>
                      </Link>
                    </div>
                  </td>
                  <td className="py-1.5 px-1.5 text-center tabular-nums font-bold text-accent-light">
                    {player.points}
                  </td>
                  <td className="py-1.5 px-1.5 text-center tabular-nums">
                    {stats.TOG ?? 0}
                  </td>
                  {ALL_STATS.map((s) => (
                    <StatCell
                      key={s.key}
                      statKey={s.key}
                      value={stats[s.key] ?? 0}
                    />
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
