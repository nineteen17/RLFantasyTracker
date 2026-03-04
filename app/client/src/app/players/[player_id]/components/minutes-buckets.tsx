"use client";

import { useMemo, useState } from "react";
import type { PlayerHistoryMatch } from "@nrl/types";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";

interface MinutesBucketsProps {
  matches: PlayerHistoryMatch[];
  isLoading: boolean;
}

interface BucketDef {
  label: string;
  min: number;
  max: number | null;
}

const BUCKETS: BucketDef[] = [
  { label: "0-29", min: 0, max: 29 },
  { label: "30-39", min: 30, max: 39 },
  { label: "40-49", min: 40, max: 49 },
  { label: "50-59", min: 50, max: 59 },
  { label: "60-69", min: 60, max: 69 },
  { label: "70+", min: 70, max: null },
];

function getTog(match: PlayerHistoryMatch): number {
  const stats = match.stats as Record<string, unknown>;
  const tog = stats.TOG;
  if (typeof tog === "number" && Number.isFinite(tog)) return tog;
  return 0;
}

function summarize(rows: Array<{ fantasyPoints: number; tog: number }>) {
  if (rows.length === 0) {
    return {
      games: 0,
      avg: null as number | null,
      ppm: null as number | null,
      high: null as number | null,
      low: null as number | null,
    };
  }
  const points = rows.map((row) => row.fantasyPoints);
  const total = points.reduce((sum, p) => sum + p, 0);
  const totalMinutes = rows.reduce((sum, row) => sum + Math.max(row.tog, 0), 0);
  return {
    games: points.length,
    avg: total / points.length,
    ppm: totalMinutes > 0 ? total / totalMinutes : null,
    high: Math.max(...points),
    low: Math.min(...points),
  };
}

export function MinutesBuckets({ matches, isLoading }: MinutesBucketsProps) {
  const [minMinutes, setMinMinutes] = useState(40);
  const [maxMinutes, setMaxMinutes] = useState(50);

  const bucketRows = useMemo(() => {
    return BUCKETS.map((bucket) => {
      const rows = matches
        .filter((m) => {
          const tog = getTog(m);
          const inLower = tog >= bucket.min;
          const inUpper = bucket.max == null ? true : tog <= bucket.max;
          return inLower && inUpper;
        })
        .map((m) => ({
          fantasyPoints: m.fantasyPoints,
          tog: getTog(m),
        }));

      return {
        ...bucket,
        ...summarize(rows),
      };
    });
  }, [matches]);

  const customRange = useMemo(() => {
    const low = Math.min(minMinutes, maxMinutes);
    const high = Math.max(minMinutes, maxMinutes);

    const rows = matches
      .filter((m) => {
        const tog = getTog(m);
        return tog >= low && tog <= high;
      })
      .map((m) => ({
        fantasyPoints: m.fantasyPoints,
        tog: getTog(m),
      }));

    return {
      min: low,
      max: high,
      ...summarize(rows),
    };
  }, [matches, maxMinutes, minMinutes]);

  if (isLoading) return <Skeleton className="h-56" />;
  if (!matches || matches.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-bold">Minutes Bands</h2>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm md:text-base">
          <thead>
            <tr className="border-b border-border text-xs text-muted md:text-sm">
              <th className="pb-2 text-left font-medium">Minutes</th>
              <th className="pb-2 text-right font-medium">GP</th>
              <th className="pb-2 text-right font-medium">Avg</th>
              <th className="pb-2 text-right font-medium">PPM</th>
              <th className="pb-2 text-right font-medium">High</th>
              <th className="pb-2 text-right font-medium">Low</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {bucketRows.map((row) => (
              <tr key={row.label}>
                <td className="py-2 font-medium">{row.label}</td>
                <td className="py-2 text-right tabular-nums">{row.games}</td>
                <td className="py-2 text-right tabular-nums">
                  {row.avg == null ? "-" : formatNumber(row.avg)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {row.ppm == null ? "-" : row.ppm.toFixed(2)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {row.high ?? "-"}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {row.low ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 border-t border-border/60 pt-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted md:text-sm">Custom Range</span>
            <input
              type="number"
              min={0}
              value={minMinutes}
              onChange={(e) =>
                setMinMinutes(Math.max(0, Number(e.target.value) || 0))
              }
              className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-sm tabular-nums"
            />
            <span className="text-xs text-muted">to</span>
            <input
              type="number"
              min={0}
              value={maxMinutes}
              onChange={(e) =>
                setMaxMinutes(Math.max(0, Number(e.target.value) || 0))
              }
              className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-sm tabular-nums"
            />
            <span className="text-xs text-muted md:text-sm">minutes</span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs md:text-sm">
            <span className="text-muted">
              GP{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {customRange.games}
              </span>
            </span>
            <span className="text-muted">
              Avg{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {customRange.avg == null ? "-" : formatNumber(customRange.avg)}
              </span>
            </span>
            <span className="text-muted">
              PPM{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {customRange.ppm == null ? "-" : customRange.ppm.toFixed(2)}
              </span>
            </span>
            <span className="text-muted">
              High{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {customRange.high ?? "-"}
              </span>
            </span>
            <span className="text-muted">
              Low{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {customRange.low ?? "-"}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
