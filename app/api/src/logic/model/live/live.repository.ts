import {
	fetchUpstream,
	fetchUpstreamPath,
} from "@src/worker/upstream/client";
import type {
	UpstreamRound,
	UpstreamMatchStats,
} from "@src/worker/upstream/types";
import { inArray } from "drizzle-orm";
import db from "@database/data-source";
import { players } from "@database/schema";
import { calculateFantasyPoints } from "@src/logic/shared/constants/scoring";
import type {
	LiveRoundResponse,
	LiveRoundsListResponse,
	LiveStatsResponse,
	PlayerMatchRawStats,
} from "@nrl/types";

/**
 * Fetch all rounds from upstream and return both
 * a summary list and the active round detail.
 */
export async function fetchLiveRounds(): Promise<LiveRoundsListResponse> {
	const rounds = await fetchUpstream<UpstreamRound[]>("rounds");

	const active = rounds.find((r) => r.status === "active");
	const current = active ?? rounds.find((r) => r.status === "scheduled");

	const summaries = rounds.map((r) => ({
		roundId: r.id,
		status: r.status,
		matchCount: r.matches.length,
	}));

	let activeRound: LiveRoundResponse | null = null;
	if (current) {
		activeRound = mapRound(current);
	}

	return { rounds: summaries, activeRound };
}

/**
 * Fetch a specific round by ID from upstream.
 */
export async function fetchLiveRound(
	roundId: number,
): Promise<LiveRoundResponse | null> {
	const rounds = await fetchUpstream<UpstreamRound[]>("rounds");
	const round = rounds.find((r) => r.id === roundId);
	return round ? mapRound(round) : null;
}

/**
 * Fetch per-player stats for a round from upstream,
 * enrich with player names from DB, and calculate fantasy points.
 *
 * stats/{roundId}.json returns ALL players across all matches in that round.
 */
export async function fetchLiveRoundStats(
	roundId: number,
): Promise<LiveStatsResponse> {
	const raw = await fetchUpstreamPath<UpstreamMatchStats>(
		`stats/${roundId}.json`,
	);

	const playerIds = Object.keys(raw).map(Number);

	// Batch-lookup player names from the DB
	const dbPlayers =
		playerIds.length > 0
			? await db
					.select({
						playerId: players.playerId,
						fullName: players.fullName,
						squadId: players.squadId,
					})
					.from(players)
					.where(inArray(players.playerId, playerIds))
			: [];

	const playerMap = new Map(dbPlayers.map((p) => [p.playerId, p]));

	const enriched = playerIds.map((id) => {
		const dbPlayer = playerMap.get(id);
		const stats = (raw[String(id)] ?? {}) as PlayerMatchRawStats;
		return {
			playerId: id,
			fullName: dbPlayer?.fullName ?? `Player ${id}`,
			squadId: dbPlayer?.squadId ?? null,
			stats,
			points: calculateFantasyPoints(stats as unknown as Record<string, number>),
		};
	});

	return {
		roundId,
		players: enriched,
	};
}

/**
 * Fetch a single player's stats across all completed/active rounds.
 */
export async function fetchPlayerRoundStats(
	playerId: number,
): Promise<{ roundId: number; stats: PlayerMatchRawStats; points: number }[]> {
	const rounds = await fetchUpstream<UpstreamRound[]>("rounds");
	const playedRounds = rounds.filter(
		(r) => r.status === "complete" || r.status === "active",
	);

	const results: { roundId: number; stats: PlayerMatchRawStats; points: number }[] = [];

	for (const round of playedRounds) {
		try {
			const raw = await fetchUpstreamPath<UpstreamMatchStats>(
				`stats/${round.id}.json`,
			);
			const playerStats = raw[String(playerId)];
			if (playerStats) {
				const stats = playerStats as PlayerMatchRawStats;
				results.push({
					roundId: round.id,
					stats,
					points: calculateFantasyPoints(stats as unknown as Record<string, number>),
				});
			}
		} catch {
			// Round stats not available yet
		}
	}

	return results.sort((a, b) => a.roundId - b.roundId);
}

function mapRound(r: UpstreamRound): LiveRoundResponse {
	return {
		roundId: r.id,
		status: r.status,
		matches: r.matches.map((m) => ({
			id: m.id,
			match: m.match,
			homeSquadId: m.home_squad_id,
			awaySquadId: m.away_squad_id,
			homeSquadName: m.home_squad_name,
			awaySquadName: m.away_squad_name,
			homeScore: m.home_score,
			awayScore: m.away_score,
			status: m.status,
			venueName: m.venue_name,
			date: m.date,
			clock: m.clock,
		})),
	};
}
