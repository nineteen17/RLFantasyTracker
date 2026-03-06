import { sql } from "drizzle-orm";
import db from "@database/data-source";
import {
	playerMatchStatsHistory,
	playerRoundStats,
	rounds,
} from "@database/schema";
import logger from "@src/logic/shared/utils/logger";

const FOOTY_STATS_BASE_URL = "https://footystatistics.com/api/player-stats";

export interface FootyStatsResponse {
	stats?: unknown;
}

export interface FootyStatsRequestOptions {
	timeoutMs: number;
	maxRetries: number;
}

export interface NormalizedStatRow {
	season: number;
	roundId: number;
	playerId: number;
	squadId: number;
	matchId: number | null;
	matchType: string;
	matchDate: Date | null;
	fantasyPoints: number | null;
	timeOnGround: number | null;
	tries: number | null;
	tryAssists: number | null;
	tackles: number | null;
	missedTackles: number | null;
	metresGained: number | null;
	kickMetres: number | null;
	errors: number | null;
	offloads: number | null;
	raw: Record<string, unknown>;
}

export interface DedupeBySeasonRoundResult {
	deduped: NormalizedStatRow[];
	skipped: number;
}

export interface DedupeBySeasonMatchResult {
	deduped: NormalizedStatRow[];
	skipped: number;
	droppedNoMatchId: number;
}

interface EnsureRoundExistsOptions {
	sourceTag?: string;
}

export interface FootyStatsAuthHeadersResult {
	headers: HeadersInit | null;
	missing: string[];
}

interface UpsertHistoryRowsOptions {
	matchRows: NormalizedStatRow[];
	roundRows: NormalizedStatRow[];
	dryRun?: boolean;
}

function matchTypePriority(matchType: string): number {
	if (matchType === "nrl") return 3;
	if (matchType === "finals") return 2;
	if (matchType === "pre-season-trial") return 1;
	return 0;
}

function shouldReplacePreferredRow(
	current: NormalizedStatRow,
	candidate: NormalizedStatRow,
): boolean {
	const currentPriority = matchTypePriority(current.matchType);
	const candidatePriority = matchTypePriority(candidate.matchType);
	if (candidatePriority !== currentPriority) {
		return candidatePriority > currentPriority;
	}
	if (current.fantasyPoints == null && candidate.fantasyPoints != null) {
		return true;
	}
	if (current.matchDate == null && candidate.matchDate != null) {
		return true;
	}
	if (current.matchDate && candidate.matchDate) {
		return candidate.matchDate.getTime() > current.matchDate.getTime();
	}
	if (current.matchId == null && candidate.matchId != null) {
		return true;
	}
	return false;
}

export function parseIntSafe(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return Math.trunc(value);
	}
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number.parseInt(value, 10);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

export function parseDateSafe(value: unknown): Date | null {
	if (typeof value !== "string" || value.trim() === "") return null;
	const isoLike = value.includes("T") ? value : value.replace(" ", "T");
	const parsed = new Date(isoLike);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeError(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizeStats(
	playerId: number,
	rawStats: unknown[],
): { validRows: NormalizedStatRow[]; invalidCount: number } {
	const validRows: NormalizedStatRow[] = [];
	let invalidCount = 0;

	for (const raw of rawStats) {
		if (!raw || typeof raw !== "object") {
			invalidCount++;
			continue;
		}

		const row = raw as Record<string, unknown>;
		const season = parseIntSafe(row.year);
		const roundId = parseIntSafe(row.round_id);
		const squadId = parseIntSafe(row.squad_id);

		if (!season || !roundId || !squadId) {
			invalidCount++;
			continue;
		}

		const rowPlayerId = parseIntSafe(row.player_id) ?? playerId;
		if (rowPlayerId !== playerId) {
			invalidCount++;
			continue;
		}

		validRows.push({
			season,
			roundId,
			playerId: rowPlayerId,
			squadId,
			matchId: parseIntSafe(row.match_id),
			matchType: typeof row.match_type === "string" ? row.match_type : "unknown",
			matchDate: parseDateSafe(row.match_date),
			fantasyPoints: parseIntSafe(row.fantasy_points),
			timeOnGround: parseIntSafe(row.time_on_ground),
			tries: parseIntSafe(row.tries),
			tryAssists: parseIntSafe(row.try_assists),
			tackles: parseIntSafe(row.tackles),
			missedTackles: parseIntSafe(row.missed_tackles),
			metresGained: parseIntSafe(row.metres_gained),
			kickMetres: parseIntSafe(row.kick_metres),
			errors: parseIntSafe(row.errors),
			offloads: parseIntSafe(row.offloads),
			raw: row,
		});
	}

	return { validRows, invalidCount };
}

export function dedupeBySeasonRound(
	rows: NormalizedStatRow[],
): DedupeBySeasonRoundResult {
	const byKey = new Map<string, NormalizedStatRow>();
	let skipped = 0;

	for (const row of rows) {
		const key = `${row.season}:${row.roundId}:${row.playerId}`;
		const existing = byKey.get(key);
		if (!existing) {
			byKey.set(key, row);
			continue;
		}

		if (shouldReplacePreferredRow(existing, row)) {
			byKey.set(key, row);
			skipped++;
			continue;
		}

		skipped++;
	}

	return { deduped: [...byKey.values()], skipped };
}

export function dedupeBySeasonMatch(
	rows: NormalizedStatRow[],
): DedupeBySeasonMatchResult {
	const byKey = new Map<string, NormalizedStatRow>();
	let skipped = 0;
	let droppedNoMatchId = 0;

	for (const row of rows) {
		if (row.matchId == null) {
			droppedNoMatchId++;
			continue;
		}

		const key = `${row.season}:${row.matchId}:${row.playerId}`;
		const existing = byKey.get(key);
		if (!existing) {
			byKey.set(key, row);
			continue;
		}

		if (shouldReplacePreferredRow(existing, row)) {
			byKey.set(key, row);
			skipped++;
			continue;
		}

		skipped++;
	}

	return { deduped: [...byKey.values()], skipped, droppedNoMatchId };
}

function isRetryableStatus(status: number): boolean {
	return status === 429 || status >= 500;
}

export async function fetchPlayerStatsWithRetry(
	playerId: number,
	options: FootyStatsRequestOptions,
	headers: HeadersInit,
): Promise<{ response: FootyStatsResponse; attempts: number }> {
	let attempt = 0;
	let lastError: unknown;

	while (attempt <= options.maxRetries) {
		attempt++;
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

		try {
			const res = await fetch(`${FOOTY_STATS_BASE_URL}?player_id=${playerId}`, {
				method: "GET",
				headers,
				signal: controller.signal,
			});
			clearTimeout(timeout);

			if (!res.ok) {
				const body = await res.text().catch(() => "");
				if (isRetryableStatus(res.status) && attempt <= options.maxRetries) {
					const backoff = Math.min(30000, 1000 * 2 ** (attempt - 1));
					const jitter = Math.floor(Math.random() * 250);
					logger.warn(
						`Retryable HTTP ${res.status} for player ${playerId} (attempt ${attempt}/${options.maxRetries + 1}). Retrying in ${backoff + jitter}ms.`,
					);
					await sleep(backoff + jitter);
					continue;
				}

				throw new Error(
					`HTTP ${res.status} for player ${playerId}: ${res.statusText}${body ? ` | ${body.slice(0, 180)}` : ""}`,
				);
			}

			const response = (await res.json()) as FootyStatsResponse;
			return { response, attempts: attempt };
		} catch (error) {
			clearTimeout(timeout);
			lastError = error;
			const isAbort = error instanceof Error && error.name === "AbortError";
			const isNetwork = error instanceof TypeError || isAbort;
			if (isNetwork && attempt <= options.maxRetries) {
				const backoff = Math.min(30000, 1000 * 2 ** (attempt - 1));
				const jitter = Math.floor(Math.random() * 250);
				logger.warn(
					`Network/timeout error for player ${playerId} (attempt ${attempt}/${options.maxRetries + 1}): ${normalizeError(error)}. Retrying in ${backoff + jitter}ms.`,
				);
				await sleep(backoff + jitter);
				continue;
			}

			throw error;
		}
	}

	throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function ensureRoundExists(
	roundId: number,
	seasonHint: number,
	knownRoundIds: Set<number>,
	dryRun: boolean,
	options?: EnsureRoundExistsOptions,
): Promise<"none" | "planned" | "inserted"> {
	if (knownRoundIds.has(roundId)) return "none";

	if (dryRun) {
		knownRoundIds.add(roundId);
		return "planned";
	}

	await db
		.insert(rounds)
		.values({
			roundId,
			season: seasonHint,
			roundDisplay: `Round ${roundId}`,
			raw: {
				source: options?.sourceTag ?? "footystatistics-history",
				note: "Stub round inserted for player history ingestion",
			},
		})
		.onConflictDoNothing();

	knownRoundIds.add(roundId);
	return "inserted";
}

function toMatchValues(
	matchRows: NormalizedStatRow[],
): (typeof playerMatchStatsHistory.$inferInsert)[] {
	return matchRows
		.filter((row) => row.matchId != null)
		.map((row) => ({
			season: row.season,
			roundId: row.roundId,
			matchId: row.matchId as number,
			playerId: row.playerId,
			squadId: row.squadId,
			matchType: row.matchType,
			matchDate: row.matchDate,
			fantasyPoints: row.fantasyPoints,
			timeOnGround: row.timeOnGround,
			tries: row.tries,
			tryAssists: row.tryAssists,
			tackles: row.tackles,
			missedTackles: row.missedTackles,
			metresGained: row.metresGained,
			kickMetres: row.kickMetres,
			errors: row.errors,
			offloads: row.offloads,
			raw: row.raw,
		}));
}

function toRoundValues(
	roundRows: NormalizedStatRow[],
): (typeof playerRoundStats.$inferInsert)[] {
	return roundRows.map((row) => ({
		season: row.season,
		roundId: row.roundId,
		playerId: row.playerId,
		matchId: row.matchId,
		fantasyPoints: row.fantasyPoints,
		timeOnGround: row.timeOnGround,
		tries: row.tries,
		tryAssists: row.tryAssists,
		tackles: row.tackles,
		missedTackles: row.missedTackles,
		metresGained: row.metresGained,
		kickMetres: row.kickMetres,
		errors: row.errors,
		offloads: row.offloads,
		raw: row.raw,
	}));
}

export async function upsertHistoryRows({
	matchRows,
	roundRows,
	dryRun = false,
}: UpsertHistoryRowsOptions): Promise<{
	matchRowsUpserted: number;
	roundRowsUpserted: number;
}> {
	const matchValues = toMatchValues(matchRows);
	const roundValues = toRoundValues(roundRows);

	if (dryRun) {
		return {
			matchRowsUpserted: matchValues.length,
			roundRowsUpserted: roundValues.length,
		};
	}

	await db.transaction(async (tx) => {
		if (matchValues.length > 0) {
			await tx
				.insert(playerMatchStatsHistory)
				.values(matchValues)
				.onConflictDoUpdate({
					target: [
						playerMatchStatsHistory.season,
						playerMatchStatsHistory.matchId,
						playerMatchStatsHistory.playerId,
					],
					set: {
						roundId: sql`excluded.round_id`,
						squadId: sql`excluded.squad_id`,
						matchType: sql`excluded.match_type`,
						matchDate: sql`excluded.match_date`,
						fantasyPoints: sql`excluded.fantasy_points`,
						timeOnGround: sql`excluded.time_on_ground`,
						tries: sql`excluded.tries`,
						tryAssists: sql`excluded.try_assists`,
						tackles: sql`excluded.tackles`,
						missedTackles: sql`excluded.missed_tackles`,
						metresGained: sql`excluded.metres_gained`,
						kickMetres: sql`excluded.kick_metres`,
						errors: sql`excluded.errors`,
						offloads: sql`excluded.offloads`,
						raw: sql`excluded.raw`,
						updatedAt: sql`now()`,
					},
				});
		}

		if (roundValues.length > 0) {
			await tx
				.insert(playerRoundStats)
				.values(roundValues)
				.onConflictDoUpdate({
					target: [
						playerRoundStats.season,
						playerRoundStats.roundId,
						playerRoundStats.playerId,
					],
					set: {
						matchId: sql`excluded.match_id`,
						fantasyPoints: sql`excluded.fantasy_points`,
						timeOnGround: sql`excluded.time_on_ground`,
						tries: sql`excluded.tries`,
						tryAssists: sql`excluded.try_assists`,
						tackles: sql`excluded.tackles`,
						missedTackles: sql`excluded.missed_tackles`,
						metresGained: sql`excluded.metres_gained`,
						kickMetres: sql`excluded.kick_metres`,
						errors: sql`excluded.errors`,
						offloads: sql`excluded.offloads`,
						raw: sql`excluded.raw`,
						updatedAt: sql`now()`,
					},
				});
		}
	});

	return {
		matchRowsUpserted: matchValues.length,
		roundRowsUpserted: roundValues.length,
	};
}

export function buildFootyStatsHeadersFromEnv(
	env: NodeJS.ProcessEnv = process.env,
): FootyStatsAuthHeadersResult {
	const cookie = env.FOOTY_STATS_COOKIE;
	const xsrf = env.FOOTY_STATS_XSRF_TOKEN;
	const userAgent = env.FOOTY_STATS_USER_AGENT;

	const missing = [
		!cookie ? "FOOTY_STATS_COOKIE" : null,
		!xsrf ? "FOOTY_STATS_XSRF_TOKEN" : null,
		!userAgent ? "FOOTY_STATS_USER_AGENT" : null,
	].filter((value): value is string => value != null);

	if (missing.length > 0) {
		return { headers: null, missing };
	}

	return {
		headers: {
			Cookie: cookie as string,
			"X-XSRF-TOKEN": xsrf as string,
			"User-Agent": userAgent as string,
			Accept: "application/json",
		},
		missing: [],
	};
}
