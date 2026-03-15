import type { PlayerCurrent } from "@nrl/types";
import { formatNumber } from "@/lib/utils";
import { POSITION_LABELS } from "@/lib/constants";
import { estimateAverageFromPrice } from "@/lib/price-model";

interface StatsOverviewProps {
  current: PlayerCurrent;
  positions: number[];
  cost: number;
}

function FormRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-muted md:text-base">{label}</span>
      <span
        className={`text-sm font-semibold tabular-nums md:text-base ${
          highlight ? "text-accent-light" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function getNextBreakEven(
  current: PlayerCurrent,
): { be: number; round: number } | null {
  const breakEvens = current.breakEvens as Record<string, number> | null;
  if (!breakEvens) return null;
  const rounds = Object.keys(breakEvens)
    .map(Number)
    .sort((a, b) => a - b);
  if (rounds.length === 0) return null;
  const rd = rounds[0];
  return { be: breakEvens[rd], round: rd };
}

function getPositionRanks(
  current: PlayerCurrent,
  positions: number[],
): Array<{ rank: number; label: string }> {
  const posRanks = current.positionRanks as Record<string, number> | null;
  if (!posRanks || positions.length === 0) return [];

  const seen = new Set<number>();
  const ranks: Array<{ rank: number; label: string }> = [];

  for (const pos of positions) {
    if (seen.has(pos)) continue;
    seen.add(pos);
    const rank = posRanks[String(pos)];
    if (rank == null) continue;
    const label = POSITION_LABELS[pos] ?? `Position ${pos}`;
    ranks.push({ rank, label });
  }

  return ranks;
}

function formatOrdinal(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "-";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "-";
  const abs = Math.abs(Math.trunc(n));
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${abs}th`;
  const mod10 = abs % 10;
  if (mod10 === 1) return `${abs}st`;
  if (mod10 === 2) return `${abs}nd`;
  if (mod10 === 3) return `${abs}rd`;
  return `${abs}th`;
}

export function StatsOverview({ current, positions, cost }: StatsOverviewProps) {
  const nextBE = getNextBreakEven(current);
  const posRanks = getPositionRanks(current, positions);
  const pricedAtAverage = estimateAverageFromPrice(cost);

  return (
    <div className="space-y-3">
      {/* Hero pair: Average + Break Even */}
      <div className="grid grid-cols-2 gap-3">
        <div className="overflow-hidden rounded-xl border border-accent-light/20 bg-gradient-to-br from-accent-light/[0.08] to-accent/[0.04] p-4 md:p-5">
          <p className="text-xs font-medium tracking-wide text-accent-light/70 uppercase md:text-sm">
            Average
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight md:text-3xl">
            {formatNumber(current.avgPoints)}
          </p>
          <p className="mt-0.5 text-xs text-muted md:text-sm">
            {formatNumber(pricedAtAverage)} priced avg
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-accent-light/20 bg-gradient-to-br from-accent-light/[0.08] to-accent/[0.04] p-4 md:p-5">
          <p className="text-xs font-medium tracking-wide text-accent-light/70 uppercase md:text-sm">
            {nextBE ? `BE (R${nextBE.round})` : "Break Even"}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight md:text-3xl">
            {nextBE ? nextBE.be : "-"}
          </p>
        </div>
      </div>

      {/* Secondary metrics row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border/60 bg-surface px-3 py-2.5 md:px-4 md:py-3">
          <p className="text-[10px] font-medium tracking-wide text-muted/80 uppercase md:text-xs">
            Games
          </p>
          <p className="mt-1 text-base font-semibold tabular-nums md:text-lg">
            {current.gamesPlayed ?? "-"}
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-surface px-3 py-2.5 md:px-4 md:py-3">
          <p className="text-[10px] font-medium tracking-wide text-muted/80 uppercase md:text-xs">
            Season Rank
          </p>
          <p className="mt-1 text-base font-semibold tabular-nums md:text-lg">
            {formatOrdinal(current.seasonRank)}
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-surface px-3 py-2.5 md:px-4 md:py-3">
          <p className="text-[10px] font-medium tracking-wide text-muted/80 uppercase md:text-xs">
            Position Rank
          </p>
          {posRanks.length === 0 ? (
            <p className="mt-1 text-sm font-semibold tabular-nums md:text-base">-</p>
          ) : (
            <>
              <div className="mt-1 space-y-0.5 md:hidden">
                {posRanks.map((pr) => (
                  <p key={pr.label} className="text-sm font-semibold tabular-nums">
                    {pr.label} {formatOrdinal(pr.rank)}
                  </p>
                ))}
              </div>
              <p className="mt-1 hidden text-base font-semibold tabular-nums md:block">
                {posRanks.map((pr) => `${pr.label} ${formatOrdinal(pr.rank)}`).join(" / ")}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Scoring form + Range */}
      <div className="grid gap-3 xl:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-surface p-4 md:p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold md:text-base">
            <span className="inline-block h-3 w-0.5 rounded-full bg-accent-light" />
            Scoring Form
          </h3>
          <div className="mt-3 divide-y divide-border/40">
            <FormRow label="Total Points" value={current.totalPoints ?? "-"} />
            <FormRow
              label="Career Avg"
              value={formatNumber(current.careerAvg)}
            />
            <FormRow label="PPM" value={formatNumber(current.ppmSeason)} />
            <FormRow
              label="Last 3 Avg"
              value={formatNumber(current.last3Avg)}
              highlight
            />
            <FormRow
              label="Last 5 Avg"
              value={formatNumber(current.last5Avg)}
              highlight
            />
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-surface p-4 md:p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold md:text-base">
            <span className="inline-block h-3 w-0.5 rounded-full bg-accent-light" />
            Range
          </h3>
          <div className="mt-3 divide-y divide-border/40">
            <FormRow label="High Score" value={current.highScore ?? "-"} />
            <FormRow label="Low Score" value={current.lowScore ?? "-"} />
            {current.highScore != null && current.lowScore != null && (
              <div className="py-3">
                <div className="flex items-center justify-between text-[10px] font-medium text-muted uppercase md:text-xs">
                  <span>{current.lowScore}</span>
                  <span>Spread</span>
                  <span>{current.highScore}</span>
                </div>
                <div className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent to-accent-light"
                    style={{
                      width: `${Math.min(100, Math.max(10, ((Number(current.highScore) - Number(current.lowScore)) / Math.max(1, Number(current.highScore))) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
