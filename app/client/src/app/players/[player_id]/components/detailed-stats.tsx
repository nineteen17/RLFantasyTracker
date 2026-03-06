"use client";

import { useMemo } from "react";
import type { PlayerHistoryMatch } from "@nrl/types";
import { ALL_STATS, statFantasyPoints } from "@/lib/stat-labels";
import { Skeleton } from "@/components/ui/skeleton";

interface DetailedStatsProps {
  matches: PlayerHistoryMatch[];
  isLoading: boolean;
}

const PRESEASON_MATCH_KEYWORDS = [
  "pre-season",
  "preseason",
  "trial",
  "allstar",
  "all-star",
  "world-club",
];

function normalizeMatchType(value: string): string {
  return value.trim().toLowerCase();
}

function isPreseasonMatchType(matchType: string): boolean {
  const normalized = normalizeMatchType(matchType);
  if (!normalized) return false;
  return PRESEASON_MATCH_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function roundLabel(match: PlayerHistoryMatch): string {
  return `${isPreseasonMatchType(match.matchType) ? "PS" : "R"}${match.roundId}`;
}

function toTimestamp(value: string | null): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
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
        <span className={`text-[10px] md:text-xs ${pts !== 0 ? (pts > 0 ? "text-green-400" : "text-red-400") : "text-muted/30"}`}>
          {pts !== 0 ? `(${Math.abs(pts)})` : "-"}
        </span>
      </div>
    </td>
  );
}

export function DetailedStats({ matches, isLoading }: DetailedStatsProps) {
  const hasMultiSeason = useMemo(() => {
    if (!matches || matches.length === 0) return false;
    return new Set(matches.map((m) => m.season)).size > 1;
  }, [matches]);

  const orderedMatches = useMemo(() => {
    if (!matches || matches.length === 0) return [];
    return [...matches].sort((a, b) => {
      const aTs = toTimestamp(a.matchDate);
      const bTs = toTimestamp(b.matchDate);

      if (aTs != null && bTs != null && aTs !== bTs) {
        return bTs - aTs;
      }
      if (aTs != null && bTs == null) return -1;
      if (aTs == null && bTs != null) return 1;

      if (a.season !== b.season) return b.season - a.season;
      if (a.roundId !== b.roundId) return b.roundId - a.roundId;
      return b.matchId - a.matchId;
    });
  }, [matches]);

  if (isLoading) return <Skeleton className="h-48" />;
  if (!matches || matches.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h2 className="text-xl font-bold">Detailed Match Stats</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm md:text-base">
          <thead>
            <tr className="text-xs text-muted md:text-sm">
              <th className="pb-2 text-left font-medium sticky left-0 bg-surface z-10">
                {hasMultiSeason ? "Season / Match" : "Match"}
              </th>
              <th className="pb-2 px-1.5 text-center font-medium text-accent-light">PTS</th>
              <th className="pb-2 px-1.5 text-center font-medium" title="Minutes Played">MP</th>
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
            {orderedMatches.map((match) => {
              const stats = match.stats as Record<string, number>;
              return (
                <tr
                  key={`${match.season}-${match.matchId}-${match.roundId}`}
                  className="border-t border-border/50 hover:bg-surface-alt/30"
                >
                  <td className="py-1.5 pr-2 font-medium whitespace-nowrap sticky left-0 bg-surface z-10">
                    {hasMultiSeason
                      ? `${match.season} · ${roundLabel(match)}`
                      : roundLabel(match)}
                  </td>
                  <td className="py-1.5 px-1.5 text-center tabular-nums font-bold text-accent-light">
                    {match.fantasyPoints}
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
            {/* Season totals row */}
            <tr className="border-t-2 border-border font-bold">
              <td className="py-2 pr-2 sticky left-0 bg-surface z-10">Total</td>
              <td className="py-2 px-1.5 text-center tabular-nums text-accent-light">
                {matches.reduce((sum, m) => sum + m.fantasyPoints, 0)}
              </td>
              <td className="py-2 px-1.5 text-center tabular-nums">
                {matches.reduce(
                  (sum, m) => sum + ((m.stats as Record<string, number>).TOG ?? 0),
                  0,
                )}
              </td>
              {ALL_STATS.map((s) => {
                const total = matches.reduce(
                  (sum, m) => sum + ((m.stats as Record<string, number>)[s.key] ?? 0),
                  0,
                );
                return (
                  <StatCell
                    key={s.key}
                    statKey={s.key}
                    value={total}
                  />
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
