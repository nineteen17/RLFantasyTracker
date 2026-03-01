export const POSITION_LABELS: Record<number, string> = {
	1: "Hooker",
	2: "Middle Forward",
	3: "Edge Forward",
	4: "Half",
	5: "Centre",
	6: "Wing / Fullback",
} as const;

export const getPositionLabel = (id: number): string =>
	POSITION_LABELS[id] ?? "Unknown";

export const getPositionLabels = (ids: number[]): string[] =>
	ids.map(getPositionLabel);
