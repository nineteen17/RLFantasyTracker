/**
 * NRL Fantasy 2026 scoring rules.
 * Source: https://fantasy.nrl.com/help/guidelines (section 8.3)
 *
 * Maps raw stat abbreviation → fantasy points per occurrence.
 * MG and KM are "per X metres" — handled separately below.
 */
const SCORING_TABLE: Record<string, number> = {
	T: 8, // Try
	G: 2, // Goal (conversion or penalty)
	FG: 5, // Field Goal
	TA: 5, // Try Assist
	LB: 4, // Line Break
	LBA: 2, // Line Break Assist
	TCK: 1, // Tackle
	TB: 2, // Tackle Break
	MT: -2, // Missed Tackle
	OFH: 4, // Offload (to hand)
	OFG: 2, // Offload (to ground)
	ER: -2, // Error
	FTF: 4, // 40/20 or 20/40
	KD: 1, // Kicks Defused
	FDO: 2, // Forced Drop-out
	TO: 4, // Turnover (strip, intercept, tackle turnover)
	TS: 5, // Try Saves
	EFIG: 2, // Escape In Goal
	PC: -2, // Penalty Conceded
	SAI: -1, // 6-again Infringement
	SB: -5, // Sin Bin (10 min)
	SO: -10, // Send Off
};

/**
 * Calculate fantasy points from raw match stats.
 */
export function calculateFantasyPoints(
	stats: Record<string, number>,
): number {
	let points = 0;

	for (const [key, multiplier] of Object.entries(SCORING_TABLE)) {
		points += (stats[key] ?? 0) * multiplier;
	}

	// Metres gained: +1 per 10m
	points += Math.floor((stats.MG ?? 0) / 10);

	// Kick metres: +1 per 30m
	points += Math.floor((stats.KM ?? 0) / 30);

	return points;
}
