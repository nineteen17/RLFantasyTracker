"use client";

import { useState } from "react";
import Link from "next/link";
import type { PlayedWithResponse } from "@nrl/types";
import { usePlayedWith } from "@/hooks/api/use-played-with";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";

type Period = "total" | "season" | "lastSeason";
type Teammate = PlayedWithResponse["teammates"][number];

interface PlayedWithCardProps {
  playerId: number;
}

export function PlayedWithCard({ playerId }: PlayedWithCardProps) {
  const { data, isLoading } = usePlayedWith(playerId);
  const [period, setPeriod] = useState<Period>("total");

  if (isLoading) return <Skeleton className="h-48" />;

  if (!data || data.teammates.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <h2 className="text-xl font-bold">Teammate Impact</h2>
        <div className="mt-4 flex h-32 items-center justify-center rounded-md border border-dashed border-border bg-surface-alt/30 text-sm text-muted md:text-base">
          Not enough teammate data available.
        </div>
      </div>
    );
  }

  const teammates = data.teammates
    .filter((t: Teammate) => t[period] !== null)
    .sort(
      (a: Teammate, b: Teammate) =>
        (b[period]?.delta ?? 0) - (a[period]?.delta ?? 0),
    );

  const periodLabels: Record<Period, string> = {
    total: "Total",
    season: data.seasonYear != null ? String(data.seasonYear) : "Season",
    lastSeason:
      data.lastSeasonYear != null ? String(data.lastSeasonYear) : "Last Season",
  };

  const periodToggle = (
    <div className="flex gap-1 rounded-lg bg-surface-alt p-1">
      {(Object.keys(periodLabels) as Period[]).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => setPeriod(p)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors md:text-sm ${period === p
              ? "bg-accent-light/20 text-accent-light"
              : "text-muted hover:text-foreground"
            }`}
        >
          {periodLabels[p]}
        </button>
      ))}
    </div>
  );

  return (
    <div className="rounded-lg border border-border bg-surface p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold">Teammate Impact</h2>
        <div className="flex flex-wrap gap-2">{periodToggle}</div>
      </div>

      {teammates.length === 0 ? (
        <div className="mt-4 flex h-32 items-center justify-center rounded-md border border-dashed border-border bg-surface-alt/30 text-sm text-muted md:text-base">
          No teammate data for this period.
        </div>
      ) : (
        <>
          {/* Desktop: table */}
          <div className="mt-4 hidden sm:block">
            <table className="w-full text-sm md:text-base">
              <thead className="border-b border-border">
                <tr>
                  <th className="pb-2 text-left text-muted font-medium">Player</th>
                  <th className="pb-2 text-right text-muted font-medium">GP</th>
                  <th className="pb-2 text-right text-muted font-medium">
                    Avg With
                  </th>
                  <th className="pb-2 text-right text-muted font-medium">GP</th>
                  <th className="pb-2 text-right text-muted font-medium">
                    Avg Without
                  </th>
                  <th className="pb-2 text-right text-muted font-medium">
                    +/-
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {teammates.map((t: Teammate) => {
                  const stats = t[period];
                  if (!stats) return null;

                  return (
                    <tr key={t.playerId} className="hover:bg-surface-alt/30">
                      <td className="py-2">
                        <div className="inline-flex items-center gap-1.5">
                          <StatusBadge status={t.status} />
                          <Link
                            href={`/players/${t.playerId}`}
                            className="text-accent-light hover:underline"
                          >
                            {t.playerName}
                          </Link>
                        </div>
                      </td>
                      <td className="py-2 text-right text-muted">{stats.gamesWith}</td>
                      <td className="py-2 text-right">
                        {formatNumber(stats.avgWith)}
                      </td>
                      <td className="py-2 text-right text-muted">{stats.gamesWithout}</td>
                      <td className="py-2 text-right">
                        {stats.avgWithout != null
                          ? formatNumber(stats.avgWithout)
                          : "-"}
                      </td>
                      <td className="py-2 text-right font-medium">
                        <DeltaValue delta={stats.delta} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: card list */}
          <div className="mt-4 space-y-3 sm:hidden">
            {teammates.map((t: Teammate) => {
              const stats = t[period];
              if (!stats) return null;

              return (
                <div
                  key={t.playerId}
                  className="rounded-md border border-border/50 bg-surface-alt/30 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-1.5">
                      <StatusBadge status={t.status} />
                      <Link
                        href={`/players/${t.playerId}`}
                        className="text-sm font-medium text-accent-light hover:underline"
                      >
                        {t.playerName}
                      </Link>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[10px] text-muted">With ({stats.gamesWith}gm)</div>
                      <div className="text-sm font-medium">
                        {formatNumber(stats.avgWith)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted">Without ({stats.gamesWithout}gm)</div>
                      <div className="text-sm font-medium">
                        {stats.avgWithout != null
                          ? formatNumber(stats.avgWithout)
                          : "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted">+/-</div>
                      <div className="text-sm font-medium">
                        <DeltaValue delta={stats.delta} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <p className="mt-3 text-xs text-muted md:text-sm">
        Current club only. Min 3 games together.
      </p>
    </div>
  );
}

function DeltaValue({ delta }: { delta: number | null }) {
  if (delta == null) return <span className="text-muted">-</span>;
  return (
    <span
      className={
        delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-muted"
      }
    >
      {delta > 0 ? "+" : ""}
      {formatNumber(delta)}
    </span>
  );
}
