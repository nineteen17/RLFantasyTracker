"use client";

import { useMemo } from "react";
import type { PlayerHistoryMatch } from "@nrl/types";
import { Skeleton } from "@/components/ui/skeleton";
import { POSITION_FULL_LABELS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";

interface PositionSplitsProps {
  matches: PlayerHistoryMatch[];
  listedPositions: number[];
  isLoading: boolean;
}

interface TaggedMatch {
  position: string;
  fantasyPoints: number;
  minutes: number;
}

interface PositionRow {
  position: string;
  games: number;
  avg: number;
  ppm: number | null;
  avgMinutes: number;
  high: number;
  low: number;
}

function canonicalizePosition(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  switch (normalized) {
    case "fullback":
      return "Fullback";
    case "wing":
    case "winger":
      return "Wing";
    case "centre":
    case "center":
      return "Centre";
    case "five-eighth":
    case "five eighth":
    case "5/8":
      return "Five-Eighth";
    case "half":
    case "half back":
    case "halfback":
      return "Halfback";
    case "hooker":
      return "Hooker";
    case "prop":
      return "Prop";
    case "2nd row":
    case "second row":
      return "2nd Row";
    case "lock":
      return "Lock";
    case "interchange":
      return "Interchange";
    case "replacement":
      return "Replacement";
    case "reserve":
      return "Reserve";
    default:
      return value.trim() || null;
  }
}

function deriveFromJersey(jerseyNumber: number | null | undefined): string | null {
  if (jerseyNumber == null) return null;
  switch (jerseyNumber) {
    case 1:
      return "Fullback";
    case 2:
    case 5:
      return "Wing";
    case 3:
    case 4:
      return "Centre";
    case 6:
      return "Five-Eighth";
    case 7:
      return "Halfback";
    case 8:
    case 10:
      return "Prop";
    case 9:
      return "Hooker";
    case 11:
    case 12:
      return "2nd Row";
    case 13:
      return "Lock";
    default:
      if (jerseyNumber >= 14 && jerseyNumber <= 17) return "Interchange";
      if (jerseyNumber >= 18) return "Reserve";
      return null;
  }
}

function getMinutes(match: PlayerHistoryMatch): number {
  const stats = match.stats as Record<string, unknown>;
  const raw = stats.TOG;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
}

function fallbackListedPosition(positions: number[]): string | null {
  if (!positions || positions.length === 0) return null;
  const primary = positions[0];
  return POSITION_FULL_LABELS[primary] ?? null;
}

function summarize(matches: TaggedMatch[]): PositionRow[] {
  const byPosition = new Map<string, TaggedMatch[]>();
  for (const match of matches) {
    const list = byPosition.get(match.position) ?? [];
    list.push(match);
    byPosition.set(match.position, list);
  }

  const rows: PositionRow[] = [];
  for (const [position, positionMatches] of byPosition.entries()) {
    const totalPoints = positionMatches.reduce(
      (sum, match) => sum + match.fantasyPoints,
      0,
    );
    const totalMinutes = positionMatches.reduce(
      (sum, match) => sum + Math.max(match.minutes, 0),
      0,
    );
    const highs = positionMatches.map((match) => match.fantasyPoints);
    rows.push({
      position,
      games: positionMatches.length,
      avg: totalPoints / positionMatches.length,
      ppm: totalMinutes > 0 ? totalPoints / totalMinutes : null,
      avgMinutes: totalMinutes / positionMatches.length,
      high: Math.max(...highs),
      low: Math.min(...highs),
    });
  }

  return rows.sort((a, b) => {
    if (b.games !== a.games) return b.games - a.games;
    return b.avg - a.avg;
  });
}

export function PositionSplits({
  matches,
  listedPositions,
  isLoading,
}: PositionSplitsProps) {
  const prepared = useMemo(() => {
    const tagged: TaggedMatch[] = [];
    const listedFallback = fallbackListedPosition(listedPositions);

    for (const match of matches) {
      const position = canonicalizePosition(match.derivedPosition)
        ?? canonicalizePosition(match.positionMatch)
        ?? deriveFromJersey(match.jerseyNumber)
        ?? canonicalizePosition(listedFallback);
      if (!position) continue;

      tagged.push({
        position,
        fantasyPoints: match.fantasyPoints,
        minutes: getMinutes(match),
      });
    }

    const rows = summarize(tagged);

    return {
      rows,
    };
  }, [listedPositions, matches]);

  if (isLoading) return <Skeleton className="h-56" />;
  if (!matches || matches.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h2 className="text-xl font-bold">Position Splits</h2>

      {prepared.rows.length === 0 ? (
        <div className="mt-4 rounded-md border border-dashed border-border bg-surface-alt/30 p-4 text-sm text-muted">
          No matches with usable position data for this scope.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm md:text-base">
            <thead>
              <tr className="border-b border-border text-xs text-muted md:text-sm">
                <th className="pb-2 text-left font-medium">Position</th>
                <th className="pb-2 text-right font-medium">GP</th>
                <th className="pb-2 text-right font-medium">Avg</th>
                <th className="pb-2 text-right font-medium">PPM</th>
                <th className="pb-2 text-right font-medium">Avg Min</th>
                <th className="pb-2 text-right font-medium">High</th>
                <th className="pb-2 text-right font-medium">Low</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {prepared.rows.map((row) => (
                <tr key={row.position}>
                  <td className="py-2 font-medium">{row.position}</td>
                  <td className="py-2 text-right tabular-nums">{row.games}</td>
                  <td className="py-2 text-right tabular-nums">
                    {formatNumber(row.avg)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {row.ppm == null ? "-" : row.ppm.toFixed(2)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {row.avgMinutes.toFixed(1)}
                  </td>
                  <td className="py-2 text-right tabular-nums">{row.high}</td>
                  <td className="py-2 text-right tabular-nums">{row.low}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
