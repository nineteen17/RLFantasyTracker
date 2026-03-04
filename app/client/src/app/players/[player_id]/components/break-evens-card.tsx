import type { PlayerCurrent } from "@nrl/types";

interface BreakEvensCardProps {
  current: PlayerCurrent;
}

export function BreakEvensCard({ current }: BreakEvensCardProps) {
  const breakEvens = current.breakEvens as Record<string, number> | null;
  const bePct = current.bePct as Record<string, number> | null;

  if (!breakEvens || Object.keys(breakEvens).length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="text-xl font-bold">Break Evens</h2>
        <p className="mt-4 text-sm text-muted">
          No break even data available
        </p>
      </div>
    );
  }

  const rounds = Object.keys(breakEvens)
    .map(Number)
    .sort((a, b) => a - b)
    .slice(0, 5);

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h2 className="text-xl font-bold">Break Evens</h2>
      <div className="mt-4 space-y-2">
        {rounds.map((round) => (
          <div key={round} className="flex items-center justify-between">
            <span className="text-sm text-muted">Round {round}</span>
            <div className="flex items-center gap-4">
              <span className="font-semibold">{breakEvens[round]}</span>
              {bePct?.[round] !== undefined && (
                <span className="text-sm text-muted">
                  ({(bePct[round] * 100).toFixed(0)}%)
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
