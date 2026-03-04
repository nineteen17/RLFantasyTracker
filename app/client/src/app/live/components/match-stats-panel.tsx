"use client";

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

export function MatchStatsPanel({
  homeSquadName,
  awaySquadName,
  homePlayers,
  awayPlayers,
  isLoading = false,
}: MatchStatsPanelProps) {
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

  return (
    <div className="divide-y divide-border">
      <TeamStatsTable teamName={homeSquadName} players={homePlayers} />
      <TeamStatsTable teamName={awaySquadName} players={awayPlayers} />
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
        <table className="w-full text-sm md:text-base">
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
                  <td className="py-2.5 pr-10 whitespace-nowrap sticky left-0 bg-surface z-10">
                    <div className="flex items-center gap-2 text-xs md:text-sm">
                      <PlayerAvatar
                        playerId={player.playerId}
                        name={player.fullName}
                      />
                      <Link
                        href={`/players/${player.playerId}`}
                        className="text-xs text-accent-light hover:underline md:text-sm"
                      >
                        {player.fullName}
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
