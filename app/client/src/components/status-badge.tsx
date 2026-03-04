const STATUS_CONFIG: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  playing: { icon: "✓", color: "text-green-400", label: "Playing" },
  uncertain: { icon: "?", color: "text-yellow-400", label: "Uncertain" },
  injured: { icon: "✚", color: "text-red-400", label: "Injured" },
  "not-playing": { icon: "✕", color: "text-red-400", label: "Not Playing" },
  suspended: { icon: "✕", color: "text-muted", label: "Suspended" },
  reserve: { icon: "○", color: "text-amber-400", label: "Reserve" },
};

interface StatusBadgeProps {
  status: string | null;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export function StatusBadge({
  status,
  showLabel = false,
  size = "sm",
}: StatusBadgeProps) {
  if (!status) return null;
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  const textClass = size === "md" ? "text-sm" : "text-xs";

  return (
    <span className={`inline-flex items-center gap-1 ${config.color}`} title={config.label}>
      <span className={`${textClass} font-bold leading-none`}>{config.icon}</span>
      {showLabel && <span className={textClass}>{config.label}</span>}
    </span>
  );
}

export const STATUS_OPTIONS = [
  { value: "playing", label: "Playing" },
  { value: "uncertain", label: "Uncertain" },
  { value: "injured", label: "Injured" },
  { value: "not-playing", label: "Not Playing" },
  { value: "suspended", label: "Suspended" },
  { value: "reserve", label: "Reserve" },
] as const;
