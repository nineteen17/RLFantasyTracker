import { and, eq, inArray } from "drizzle-orm";
import db from "@database/data-source";
import { fixtureTeamLists, fixtures } from "@database/schema";
import logger from "@src/logic/shared/utils/logger";
import {
	fetchNrlDrawData,
	fetchNrlMatchData,
} from "@src/worker/upstream/client";
import type {
	UpstreamNrlDrawFixture,
	UpstreamNrlMatchPlayer,
} from "@src/worker/upstream/types";

const DEFAULT_COMPETITION_ID = Number.parseInt(
	process.env.NRL_TEAM_LISTS_COMPETITION_ID ?? "111",
	10,
);

interface TeamListPlayer {
	playerId: number | null;
	firstName: string;
	lastName: string;
	displayName: string;
	number: number | null;
	position: string | null;
	isOnField: boolean | null;
}

export interface SyncTeamListsForRoundOptions {
	roundId: number;
	season: number;
	competitionId?: number;
	targetFixtureIds?: number[];
}

function normalizePlayer(player: UpstreamNrlMatchPlayer): TeamListPlayer {
	const firstName = player.firstName?.trim() ?? "";
	const lastName = player.lastName?.trim() ?? "";
	const displayName = `${firstName} ${lastName}`.trim() || "Unnamed Player";

	return {
		playerId: Number.isFinite(player.playerId) ? Number(player.playerId) : null,
		firstName,
		lastName,
		displayName,
		number: Number.isFinite(player.number) ? Number(player.number) : null,
		position: player.position?.trim() ?? null,
		isOnField:
			typeof player.isOnField === "boolean" ? player.isOnField : null,
	};
}

function buildFixtureKey(homeSquadId: number, awaySquadId: number): string {
	return `${homeSquadId}:${awaySquadId}`;
}

function toDateOrNow(value: string | undefined): Date {
	if (!value) return new Date();
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export async function syncTeamListsForRound(
	options: SyncTeamListsForRoundOptions,
): Promise<number> {
	const competitionId = options.competitionId ?? DEFAULT_COMPETITION_ID;
	const fixtureIdFilter =
		options.targetFixtureIds && options.targetFixtureIds.length > 0
			? new Set(options.targetFixtureIds)
			: null;

	const fixtureWhere = fixtureIdFilter
		? and(
				eq(fixtures.roundId, options.roundId),
				eq(fixtures.season, options.season),
				inArray(fixtures.fixtureId, Array.from(fixtureIdFilter)),
			)
		: and(
				eq(fixtures.roundId, options.roundId),
				eq(fixtures.season, options.season),
			);

	const localFixtures = await db
		.select({
			fixtureId: fixtures.fixtureId,
			roundId: fixtures.roundId,
			season: fixtures.season,
			homeSquadId: fixtures.homeSquadId,
			awaySquadId: fixtures.awaySquadId,
		})
		.from(fixtures)
		.where(fixtureWhere);

	if (localFixtures.length === 0) {
		logger.warn(
			`No local fixtures found for team-list sync (round ${options.roundId}, season ${options.season})`,
		);
		return 0;
	}

	const fixturesByTeams = new Map(
		localFixtures.map((fixture) => [
			buildFixtureKey(fixture.homeSquadId, fixture.awaySquadId),
			fixture,
		]),
	);

	const draw = await fetchNrlDrawData({
		competitionId,
		season: options.season,
		round: options.roundId,
	});

	const drawFixtures = (draw.fixtures ?? []).filter(
		(fixture): fixture is Required<Pick<UpstreamNrlDrawFixture, "matchCentreUrl" | "homeTeam" | "awayTeam">> &
			UpstreamNrlDrawFixture =>
			fixture.type === "Match" &&
			!!fixture.matchCentreUrl &&
			!!fixture.homeTeam?.teamId &&
			!!fixture.awayTeam?.teamId,
	);

	let synced = 0;

	for (const drawFixture of drawFixtures) {
		const key = buildFixtureKey(
			drawFixture.homeTeam.teamId,
			drawFixture.awayTeam.teamId,
		);
		const localFixture = fixturesByTeams.get(key);
		if (!localFixture) {
			continue;
		}
		if (fixtureIdFilter && !fixtureIdFilter.has(localFixture.fixtureId)) {
			continue;
		}

		try {
			const matchData = await fetchNrlMatchData(drawFixture.matchCentreUrl);
			const homePlayers = (matchData.homeTeam?.players ?? []).map(normalizePlayer);
			const awayPlayers = (matchData.awayTeam?.players ?? []).map(normalizePlayer);
			const sourceUpdatedAt = toDateOrNow(matchData.updated);
			const now = new Date();

			await db
				.insert(fixtureTeamLists)
				.values({
					season: localFixture.season,
					roundId: localFixture.roundId,
					fixtureId: localFixture.fixtureId,
					homeSquadId: localFixture.homeSquadId,
					awaySquadId: localFixture.awaySquadId,
					homePlayers: homePlayers as unknown as Record<string, unknown>,
					awayPlayers: awayPlayers as unknown as Record<string, unknown>,
					source: "nrl.com",
					sourceUpdatedAt,
				})
				.onConflictDoUpdate({
					target: [fixtureTeamLists.roundId, fixtureTeamLists.fixtureId],
					set: {
						homeSquadId: localFixture.homeSquadId,
						awaySquadId: localFixture.awaySquadId,
						homePlayers: homePlayers as unknown as Record<string, unknown>,
						awayPlayers: awayPlayers as unknown as Record<string, unknown>,
						source: "nrl.com",
						sourceUpdatedAt,
						updatedAt: now,
					},
				});

			synced++;
		} catch (error) {
			logger.warn(
				`Team-list sync failed for fixture ${localFixture.fixtureId}: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	}

	logger.info(
		`Synced ${synced} team-list entries (season ${options.season}, round ${options.roundId})`,
	);
	return synced;
}
