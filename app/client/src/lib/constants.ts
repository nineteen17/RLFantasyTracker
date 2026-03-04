export const POSITION_LABELS: Record<number, string> = {
  1: "HOK",
  2: "MID",
  3: "EDG",
  4: "HLF",
  5: "CTR",
  6: "WFB",
};

export const POSITION_FULL_LABELS: Record<number, string> = {
  1: "Hooker",
  2: "Middle Forward",
  3: "Edge Forward",
  4: "Half",
  5: "Centre",
  6: "Wing / Fullback",
};

export const POSITION_OPTIONS = [
  { value: 1, label: "Hooker" },
  { value: 2, label: "Middle Forward" },
  { value: 3, label: "Edge Forward" },
  { value: 4, label: "Half" },
  { value: 5, label: "Centre" },
  { value: 6, label: "Wing / Fullback" },
] as const;
