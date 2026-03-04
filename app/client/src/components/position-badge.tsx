import { POSITION_LABELS } from "@/lib/constants";

export function PositionBadge({ positions }: { positions: number[] }) {
  return (
    <div className="flex gap-1">
      {positions.map((pos) => (
        <span
          key={pos}
          className="rounded bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent-light"
        >
          {POSITION_LABELS[pos] ?? pos}
        </span>
      ))}
    </div>
  );
}
