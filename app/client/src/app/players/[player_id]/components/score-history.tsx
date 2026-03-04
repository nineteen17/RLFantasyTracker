import { useMemo } from "react";
import type { PlayerHistoryMatch } from "@nrl/types";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";

interface ScoreHistoryProps {
  matches: PlayerHistoryMatch[];
  allMatches: PlayerHistoryMatch[];
  isLoading: boolean;
  scopeLabel: string;
}

const EMPTY_MATCHES: PlayerHistoryMatch[] = [];

export function ScoreHistory({
  matches,
  allMatches,
  isLoading,
  scopeLabel,
}: ScoreHistoryProps) {
  const safeMatches = matches ?? EMPTY_MATCHES;
  const safeAllMatches = allMatches ?? EMPTY_MATCHES;
  const yearlyRows = useMemo(() => {
    if (safeMatches.length === 0) return [];
    const bySeason = new Map<number, number[]>();
    for (const match of safeMatches) {
      const values = bySeason.get(match.season) ?? [];
      values.push(match.fantasyPoints);
      bySeason.set(match.season, values);
    }

    const rows = [...bySeason.entries()]
      .map(([season, points]) => {
        const total = points.reduce((sum, p) => sum + p, 0);
        return {
          season,
          games: points.length,
          avg: total / points.length,
          high: Math.max(...points),
          low: Math.min(...points),
        };
      })
      .sort((a, b) => a.season - b.season);

    return rows;
  }, [safeMatches]);

  if (isLoading) return <Skeleton className="h-48" />;

  if (safeMatches.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="text-xl font-bold">Score History</h2>
        <div className="mt-4 flex h-32 items-center justify-center rounded-md border border-dashed border-border bg-surface-alt/30 text-sm text-muted">
          No scores available for this period.
        </div>
      </div>
    );
  }

  const periodTotal = safeMatches.reduce((sum, m) => sum + m.fantasyPoints, 0);
  const periodAvg = safeMatches.length > 0 ? periodTotal / safeMatches.length : 0;
  const allTimeTotal = safeAllMatches.reduce((sum, m) => sum + m.fantasyPoints, 0);
  const allTimeAvg =
    safeAllMatches.length > 0 ? allTimeTotal / safeAllMatches.length : 0;
  const maxYearlyAvg = Math.max(...yearlyRows.map((row) => row.avg), 1);
  const careerLinePct = (() => {
    const clampedCareerAvg = Math.min(Math.max(allTimeAvg, 0), maxYearlyAvg);
    return (clampedCareerAvg / maxYearlyAvg) * 100;
  })();
  const chartGridTemplate = `repeat(${yearlyRows.length}, 4.25rem)`;

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="text-xl font-bold">Yearly Score Trends</h2>
        <div className="grid grid-cols-3 gap-4 text-sm md:text-base">
          <div>
            <span className="text-muted">{scopeLabel} Avg</span>{" "}
            <span className="font-semibold tabular-nums">{formatNumber(periodAvg)}</span>
          </div>
          <div>
            <span className="text-muted">All Years Avg</span>{" "}
            <span className="font-semibold tabular-nums">{formatNumber(allTimeAvg)}</span>
          </div>
          <div>
            <span className="text-muted">Games</span>{" "}
            <span className="font-semibold tabular-nums">{safeMatches.length}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto pb-1">
        <div className="flex justify-start lg:justify-center">
          <div className="min-w-max">
          <div className="grid gap-2" style={{ gridTemplateColumns: chartGridTemplate }}>
            {yearlyRows.map((row) => (
              <div
                key={`yearly-val-${row.season}`}
                className="text-center text-xs font-semibold tabular-nums"
              >
                {formatNumber(row.avg)}
              </div>
            ))}
          </div>
          <div className="relative mt-1 h-[120px] lg:h-[140px]">
            <div
              className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-accent-light/70"
              style={{ bottom: `${careerLinePct}%` }}
            />
            <span
              className="pointer-events-none absolute right-0 -translate-y-1/2 rounded bg-surface px-1 text-[10px] font-medium text-accent-light"
              style={{ bottom: `${careerLinePct}%` }}
            >
              Career Avg {formatNumber(allTimeAvg)}
            </span>
            <div className="grid h-full gap-2" style={{ gridTemplateColumns: chartGridTemplate }}>
              {yearlyRows.map((row) => (
                <div
                  key={`yearly-bar-${row.season}`}
                  className="flex h-full items-end justify-center"
                >
                  <div
                    className="w-7 rounded-t bg-accent"
                    style={{
                      height: `${Math.max((row.avg / maxYearlyAvg) * 100, 6)}%`,
                    }}
                    title={`${row.season}: ${formatNumber(row.avg)} avg`}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-1 grid gap-2" style={{ gridTemplateColumns: chartGridTemplate }}>
            {yearlyRows.map((row) => (
              <div
                key={`yearly-label-${row.season}`}
                className="text-center text-[10px] text-muted tabular-nums"
              >
                {row.season}
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm md:text-base">
          <thead>
            <tr className="border-b border-border text-xs text-muted md:text-sm">
              <th className="pb-2 text-left font-medium">Season</th>
              <th className="pb-2 text-right font-medium">GP</th>
              <th className="pb-2 text-right font-medium">Avg</th>
              <th className="pb-2 text-right font-medium">High</th>
              <th className="pb-2 text-right font-medium">Low</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {yearlyRows.map((row) => (
              <tr key={row.season}>
                <td className="py-2 font-medium">{row.season}</td>
                <td className="py-2 text-right tabular-nums">{row.games}</td>
                <td className="py-2 text-right tabular-nums">{formatNumber(row.avg)}</td>
                <td className="py-2 text-right tabular-nums">{row.high}</td>
                <td className="py-2 text-right tabular-nums">{row.low}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
