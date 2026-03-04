/**
 * All NRL Fantasy scoring stat keys with display labels.
 * Ordered by importance / typical display priority.
 */
export const ALL_STATS = [
  { key: "T", label: "T", full: "Tries" },
  { key: "TA", label: "TA", full: "Try Assists" },
  { key: "G", label: "G", full: "Goals" },
  { key: "FG", label: "FG", full: "Field Goals" },
  { key: "LB", label: "LB", full: "Line Breaks" },
  { key: "LBA", label: "LBA", full: "LB Assists" },
  { key: "TB", label: "TB", full: "Tackle Breaks" },
  { key: "TCK", label: "TCK", full: "Tackles" },
  { key: "MT", label: "MT", full: "Missed Tackles" },
  { key: "OFH", label: "OFH", full: "Offloads (Hand)" },
  { key: "OFG", label: "OFG", full: "Offloads (Ground)" },
  { key: "MG", label: "MG", full: "Metres Gained" },
  { key: "KM", label: "KM", full: "Kick Metres" },
  { key: "KD", label: "KD", full: "Kicks Defused" },
  { key: "FDO", label: "FDO", full: "Forced Drop-outs" },
  { key: "TO", label: "TO", full: "Turnovers" },
  { key: "TS", label: "TS", full: "Try Saves" },
  { key: "FTF", label: "FTF", full: "40/20" },
  { key: "EFIG", label: "EFIG", full: "Escape In Goal" },
  { key: "ER", label: "ER", full: "Errors" },
  { key: "PC", label: "PC", full: "Penalties" },
  { key: "SAI", label: "SAI", full: "6-Again" },
] as const;

export const STAT_LABEL_MAP: Record<string, string> = Object.fromEntries(
  ALL_STATS.map((s) => [s.key, s.label]),
);

export const STAT_FULL_MAP: Record<string, string> = Object.fromEntries(
  ALL_STATS.map((s) => [s.key, s.full]),
);

/** Points multiplier per stat occurrence (mirrors server scoring.ts) */
const SCORING: Record<string, number> = {
  T: 8, TA: 5, G: 2, FG: 5, LB: 4, LBA: 2, TB: 2,
  TCK: 1, MT: -2, OFH: 4, OFG: 2, KD: 1, FDO: 2,
  TO: 4, TS: 5, FTF: 4, EFIG: 2, ER: -2, PC: -2,
  SAI: -1, SB: -5, SO: -10,
};

/** Calculate the fantasy points a single stat contributes */
export function statFantasyPoints(key: string, value: number): number {
  if (key === "MG") return Math.floor(value / 10);
  if (key === "KM") return Math.floor(value / 30);
  if (key === "TOG") return 0;
  return value * (SCORING[key] ?? 0);
}
