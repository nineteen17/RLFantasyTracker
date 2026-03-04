import type { PlayerCurrent } from "@nrl/types";
import { formatNumber } from "@/lib/utils";
import { POSITION_LABELS } from "@/lib/constants";

interface StatsOverviewProps {
  current: PlayerCurrent;
  positions: number[];
}

function MetricTile({
  label,
  value,
  tone = "default",
  compact = false,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "accent";
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        tone === "accent"
          ? "border-accent-light/30 bg-accent-light/10"
          : "border-border bg-surface-alt/35"
      }`}
    >
      <p className="text-xs text-muted md:text-sm">{label}</p>
      <p
        className={`mt-1 font-semibold tabular-nums ${
          compact ? "text-base leading-tight md:text-lg" : "text-lg md:text-xl"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-muted md:text-base">{label}</span>
      <span className="text-sm font-semibold tabular-nums md:text-base">{value}</span>
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

function formatPositionRankValue(posRanks: Array<{ rank: number; label: string }>) {
  if (posRanks.length === 0) return "-";
  return posRanks
    .map((posRank) => `${posRank.label} ${formatOrdinal(posRank.rank)}`)
    .join(" / ");
}

export function StatsOverview({ current, positions }: StatsOverviewProps) {
  const nextBE = getNextBreakEven(current);
  const posRanks = getPositionRanks(current, positions);
  const positionRankValue = formatPositionRankValue(posRanks);

  return (
    <div className="rounded-xl border border-border bg-surface p-4 md:p-6">
      <h2 className="text-xl font-bold">Stats Overview</h2>
      <p className="mt-1 text-sm text-muted md:text-base">
        Form, output, and context at a glance.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricTile
          label="Avg Points"
          value={formatNumber(current.avgPoints)}
          tone="accent"
        />
        <MetricTile
          label="Position Rank"
          value={positionRankValue}
          compact
        />
        <MetricTile label="Games Played" value={current.gamesPlayed ?? "-"} />
        <MetricTile
          label={nextBE ? `Break Even (R${nextBE.round})` : "Break Even"}
          value={nextBE ? nextBE.be : "-"}
        />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface-alt/25 p-3.5 md:p-4">
          <h3 className="text-sm font-semibold text-foreground md:text-base">
            Scoring Form
          </h3>
          <div className="mt-2 divide-y divide-border/50">
            <DetailRow label="Total Points" value={current.totalPoints ?? "-"} />
            <DetailRow label="Career Avg" value={formatNumber(current.careerAvg)} />
            <DetailRow label="PPM" value={formatNumber(current.ppmSeason)} />
            <DetailRow label="Last 3 Avg" value={formatNumber(current.last3Avg)} />
            <DetailRow label="Last 5 Avg" value={formatNumber(current.last5Avg)} />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-alt/25 p-3.5 md:p-4">
          <h3 className="text-sm font-semibold text-foreground md:text-base">
            Range & Rank
          </h3>
          <div className="mt-2 divide-y divide-border/50">
            <DetailRow label="High Score" value={current.highScore ?? "-"} />
            <DetailRow label="Low Score" value={current.lowScore ?? "-"} />
            <DetailRow
              label="Season Rank"
              value={formatOrdinal(current.seasonRank)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
