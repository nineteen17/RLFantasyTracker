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
import { fixtureTeamLists, players } from "@database/schema";
import { calculateFantasyPoints } from "@src/logic/shared/constants/scoring";
import type {
	LiveRoundResponse,
	LiveRoundTeamListsResponse,
	LiveRoundsListResponse,
	LiveStatsResponse,
	PlayerMatchRawStats,
	LiveTeamListPlayer,
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
	includeTeamLists = false,
): Promise<LiveRoundResponse | null> {
	const rounds = await fetchUpstream<UpstreamRound[]>("rounds");
	const round = rounds.find((r) => r.id === roundId);
	if (!round) return null;

	const teamLists = includeTeamLists ? await fetchRoundTeamListMap(roundId) : null;
	return mapRound(round, teamLists);
}

export async function fetchRoundTeamLists(
	roundId: number,
): Promise<LiveRoundTeamListsResponse> {
	const rows = await db
		.select({
			fixtureId: fixtureTeamLists.fixtureId,
			homeSquadId: fixtureTeamLists.homeSquadId,
			awaySquadId: fixtureTeamLists.awaySquadId,
			homePlayers: fixtureTeamLists.homePlayers,
			awayPlayers: fixtureTeamLists.awayPlayers,
			sourceUpdatedAt: fixtureTeamLists.sourceUpdatedAt,
		})
		.from(fixtureTeamLists)
		.where(inArray(fixtureTeamLists.roundId, [roundId]));

	return {
		roundId,
		matches: rows.map((row) => ({
			fixtureId: row.fixtureId,
			homeSquadId: row.homeSquadId,
			awaySquadId: row.awaySquadId,
			homePlayers: normalizeTeamListPlayers(row.homePlayers),
			awayPlayers: normalizeTeamListPlayers(row.awayPlayers),
			sourceUpdatedAt: row.sourceUpdatedAt ? row.sourceUpdatedAt.toISOString() : null,
		})),
	};
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

function normalizeTeamListPlayers(raw: unknown): LiveTeamListPlayer[] {
	if (!Array.isArray(raw)) return [];

	return raw
		.map((item) => {
			if (!item || typeof item !== "object") return null;
			const asRecord = item as Record<string, unknown>;
			const firstName = String(asRecord.firstName ?? "").trim();
			const lastName = String(asRecord.lastName ?? "").trim();
			const displayNameRaw = String(asRecord.displayName ?? "").trim();
			return {
				playerId:
					typeof asRecord.playerId === "number" ? asRecord.playerId : null,
				firstName,
				lastName,
				displayName:
					displayNameRaw.length > 0
						? displayNameRaw
						: `${firstName} ${lastName}`.trim() || "Unnamed Player",
				number: typeof asRecord.number === "number" ? asRecord.number : null,
				position:
					typeof asRecord.position === "string"
						? asRecord.position
						: null,
				isOnField:
					typeof asRecord.isOnField === "boolean"
						? asRecord.isOnField
						: null,
			} satisfies LiveTeamListPlayer;
		})
		.filter((value): value is LiveTeamListPlayer => value !== null);
}

async function fetchRoundTeamListMap(roundId: number) {
	const rows = await db
		.select({
			fixtureId: fixtureTeamLists.fixtureId,
			homePlayers: fixtureTeamLists.homePlayers,
			awayPlayers: fixtureTeamLists.awayPlayers,
			sourceUpdatedAt: fixtureTeamLists.sourceUpdatedAt,
		})
		.from(fixtureTeamLists)
		.where(inArray(fixtureTeamLists.roundId, [roundId]));

	return new Map(
		rows.map((row) => [
			row.fixtureId,
			{
				homePlayers: normalizeTeamListPlayers(row.homePlayers),
				awayPlayers: normalizeTeamListPlayers(row.awayPlayers),
				sourceUpdatedAt: row.sourceUpdatedAt
					? row.sourceUpdatedAt.toISOString()
					: null,
			},
		]),
	);
}

function mapRound(
	r: UpstreamRound,
	teamLists?: Map<
		number,
		{
			homePlayers: LiveTeamListPlayer[];
			awayPlayers: LiveTeamListPlayer[];
			sourceUpdatedAt: string | null;
		}
	> | null,
): LiveRoundResponse {
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
			teamList: teamLists?.get(m.id) ?? null,
		})),
	};
}
