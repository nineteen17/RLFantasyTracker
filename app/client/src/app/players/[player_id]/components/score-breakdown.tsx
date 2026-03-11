"use client";

import { useState, useMemo } from "react";
import type { PlayerHistoryMatch } from "@nrl/types";
import { statFantasyPoints, STAT_FULL_MAP } from "@/lib/stat-labels";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";

interface ScoreBreakdownProps {
  matches: PlayerHistoryMatch[];
  isLoading: boolean;
}

interface CategoryDef {
  key: string;
  label: string;
  description: string;
  color: string;
  barColor: string;
  stats: string[];
}

const CATEGORIES: CategoryDef[] = [
  {
    key: "base",
    label: "Base",
    description: "Reliable weekly points from workload",
    color: "text-blue-400",
    barColor: "bg-blue-400",
    stats: ["TCK", "MG", "KM", "G"],
  },
  {
    key: "secondary",
    label: "Secondary",
    description: "Consistent for certain play styles",
    color: "text-cyan-400",
    barColor: "bg-cyan-400",
    stats: ["OFH", "OFG", "TB"],
  },
  {
    key: "attacking",
    label: "Attacking",
    description: "High value but variable week to week",
    color: "text-green-400",
    barColor: "bg-green-400",
    stats: ["T", "TA", "LB", "LBA"],
  },
  {
    key: "rare",
    label: "Rare",
    description: "Bonus events, hard to predict",
    color: "text-amber-400",
    barColor: "bg-amber-400",
    stats: ["TO", "TS", "FDO", "FTF", "EFIG", "KD", "FG"],
  },
  {
    key: "negative",
    label: "Negative",
    description: "Risk and discipline cost",
    color: "text-red-400",
    barColor: "bg-red-400",
    stats: ["MT", "ER", "PC", "SAI", "SB", "SO"],
  },
];

interface CategoryResult {
  def: CategoryDef;
  totalPoints: number;
  avgPoints: number;
  pct: number;
  statBreakdown: { key: string; full: string; totalCount: number; avgCount: number; totalPts: number; avgPts: number }[];
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

function keyForMatch(match: PlayerHistoryMatch): string {
  return `${match.season}_${match.matchId}`;
}

function computeBreakdown(
  rounds: { stats: Record<string, number>; points: number }[],
): CategoryResult[] {
  const gamesPlayed = rounds.length;
  if (gamesPlayed === 0) return [];

  // Calculate positive-only total for percentage base
  const results: CategoryResult[] = [];

  for (const cat of CATEGORIES) {
    const statBreakdown: CategoryResult["statBreakdown"] = [];
    let catTotal = 0;

    for (const statKey of cat.stats) {
      let totalCount = 0;
      let totalPts = 0;

      for (const round of rounds) {
        const stats = round.stats;
        const val = stats[statKey] ?? 0;
        totalCount += val;
        totalPts += statFantasyPoints(statKey, val);
      }

      catTotal += totalPts;

      // Only include stats that contributed something
      if (totalCount !== 0 || totalPts !== 0) {
        statBreakdown.push({
          key: statKey,
          full: STAT_FULL_MAP[statKey] ?? statKey,
          totalCount,
          avgCount: totalCount / gamesPlayed,
          totalPts,
          avgPts: totalPts / gamesPlayed,
        });
      }
    }

    results.push({
      def: cat,
      totalPoints: catTotal,
      avgPoints: catTotal / gamesPlayed,
      pct: 0,
      statBreakdown,
    });
  }

  // Calculate percentages based on total absolute points
  const totalAbsolute = results.reduce((s, r) => s + Math.abs(r.totalPoints), 0);
  if (totalAbsolute > 0) {
    for (const r of results) {
      r.pct = (r.totalPoints / totalAbsolute) * 100;
    }
  }

  return results;
}

function CategoryRow({ result }: { result: CategoryResult }) {
  const [expanded, setExpanded] = useState(false);
  const isNegative = result.def.key === "negative";

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 py-3 text-left hover:bg-surface-alt/30 transition-colors px-1"
      >
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${expanded ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>

        <div className="flex flex-1 items-center justify-between min-w-0">
          <div className="min-w-0">
            <span className={`font-semibold ${result.def.color}`}>
              {result.def.label}
            </span>
            <span className="ml-2 hidden text-xs text-muted sm:inline md:text-sm">
              {result.def.description}
            </span>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <span className={`text-sm font-bold tabular-nums md:text-base ${isNegative ? "text-red-400" : ""}`}>
              {result.avgPoints >= 0 ? "+" : ""}
              {result.avgPoints.toFixed(1)} avg
            </span>
            <span className="w-12 text-right text-xs text-muted tabular-nums md:text-sm">
              {result.pct >= 0 ? "" : ""}{Math.abs(result.pct).toFixed(0)}%
            </span>
          </div>
        </div>
      </button>

      {expanded && result.statBreakdown.length > 0 && (
        <div className="pb-3 pl-7 pr-1">
          <table className="w-full text-sm md:text-base">
            <thead>
              <tr className="text-xs text-muted md:text-sm">
                <th className="pb-1 text-left font-medium">Stat</th>
                <th className="pb-1 text-right font-medium">Avg Count</th>
                <th className="pb-1 text-right font-medium">Avg Pts</th>
                <th className="pb-1 text-right font-medium">Total Pts</th>
              </tr>
            </thead>
            <tbody>
              {result.statBreakdown.map((s) => (
                <tr key={s.key} className="border-t border-border/30">
                  <td className="py-1.5 text-muted">
                    <span className="font-medium text-inherit">{s.key}</span>
                    <span className="ml-1.5 text-xs text-muted/70 md:text-sm">{s.full}</span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    {s.avgCount.toFixed(1)}
                  </td>
                  <td className={`py-1.5 text-right tabular-nums font-medium ${s.avgPts > 0 ? "text-green-400" : s.avgPts < 0 ? "text-red-400" : "text-muted"}`}>
                    {s.avgPts >= 0 ? "+" : ""}{s.avgPts.toFixed(1)}
                  </td>
                  <td className={`py-1.5 text-right tabular-nums ${s.totalPts > 0 ? "text-green-400" : s.totalPts < 0 ? "text-red-400" : "text-muted"}`}>
                    {s.totalPts >= 0 ? "+" : ""}{s.totalPts}
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

export function ScoreBreakdown({ matches, isLoading }: ScoreBreakdownProps) {
  const [selectedMatchKey, setSelectedMatchKey] = useState<string>("all");
  const orderedMatches = useMemo(() => {
    if (!matches || matches.length === 0) return [];
    return [...matches].sort((a, b) => {
      const aTs = toTimestamp(a.matchDate);
      const bTs = toTimestamp(b.matchDate);

      if (aTs != null && bTs != null && aTs !== bTs) return bTs - aTs;
      if (aTs != null && bTs == null) return -1;
      if (aTs == null && bTs != null) return 1;
      if (a.season !== b.season) return b.season - a.season;
      if (a.roundId !== b.roundId) return b.roundId - a.roundId;
      return b.matchId - a.matchId;
    });
  }, [matches]);
  const matchOptions = useMemo(
    () =>
      orderedMatches.map((match) => {
        return {
          key: keyForMatch(match),
          label: `${match.season} · ${roundLabel(match)}`,
        };
      }),
    [orderedMatches],
  );
  const resolvedSelectedMatchKey = useMemo(() => {
    if (selectedMatchKey === "all") return "all";
    return matchOptions.some((option) => option.key === selectedMatchKey)
      ? selectedMatchKey
      : "all";
  }, [matchOptions, selectedMatchKey]);
  const scopedMatches = useMemo(() => {
    if (!matches || matches.length === 0) return [];
    if (resolvedSelectedMatchKey === "all") return matches;
    return matches.filter((match) => keyForMatch(match) === resolvedSelectedMatchKey);
  }, [matches, resolvedSelectedMatchKey]);
  const breakdown = useMemo(() => {
    if (scopedMatches.length === 0) return [];
    const rounds = scopedMatches.map((m) => ({
      stats: m.stats as Record<string, number>,
      points: m.fantasyPoints,
    }));
    return computeBreakdown(rounds);
  }, [scopedMatches]);

  if (isLoading) return <Skeleton className="h-48" />;
  if (!matches || matches.length === 0) return null;
  if (scopedMatches.length === 0) return null;

  const gamesPlayed = scopedMatches.length;
  const points = scopedMatches.map((m) => m.fantasyPoints);
  const totalFantasyPoints = points.reduce((sum, point) => sum + point, 0);
  const fantasyAvg = totalFantasyPoints / gamesPlayed;
  const positiveCategories = breakdown.filter((b) => b.def.key !== "negative");
  const totalBarPts = positiveCategories.reduce((s, b) => s + Math.max(0, b.avgPoints), 0);

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-bold">Score Breakdown</h2>
        <div className="flex items-center gap-2">
          <label
            htmlFor="score-breakdown-game"
            className="text-sm font-medium text-muted md:text-base"
          >
            Round/Game
          </label>
          <select
            id="score-breakdown-game"
            value={resolvedSelectedMatchKey}
            onChange={(event) => setSelectedMatchKey(event.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-light md:text-base"
          >
            <option value="all">All Games</option>
            {matchOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stacked bar */}
      {totalBarPts > 0 && (
        <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-surface-alt">
          {positiveCategories.map((cat) => {
            const width = Math.max(0, cat.avgPoints) / totalBarPts * 100;
            if (width <= 0) return null;
            return (
              <div
                key={cat.def.key}
                className={`${cat.def.barColor} transition-all`}
                style={{ width: `${width}%` }}
                title={`${cat.def.label}: ${cat.avgPoints.toFixed(1)} avg pts`}
              />
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted md:text-sm">
        {CATEGORIES.map((cat) => (
          <div key={cat.key} className="flex items-center gap-1">
            <div className={`h-2 w-2 rounded-full ${cat.barColor}`} />
            <span>{cat.label}</span>
          </div>
        ))}
      </div>

      {/* Category rows */}
      <div className="mt-4">
        {breakdown.map((result) => (
          <CategoryRow
            key={result.def.key}
            result={result}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-sm md:text-base">
        <span className="text-muted">Overall Fantasy Avg</span>
        <span className="font-semibold tabular-nums text-accent-light">
          {formatNumber(fantasyAvg)}
        </span>
      </div>
    </div>
  );
}
