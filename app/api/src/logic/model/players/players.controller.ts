import type { Request, Response } from "express";
import { APIError } from "@src/logic/shared/utils/errors/APIError";
import type { SearchQuery, PlayedWithQuery, PlayerHistoryQuery } from "./players.schema";
import {
	searchPlayers,
	findPlayerById,
	findPlayerHistoryById,
	findFixturesForPlayer,
	findByeRoundsForSquad,
	getPlayedWithStats,
} from "./players.repository";

export async function search(req: Request, res: Response) {
	const query = req.query as unknown as SearchQuery;
	const result = await searchPlayers(query);
	res.json(result);
}

export async function getPlayer(req: Request, res: Response) {
	const playerId = Number(req.params.player_id);
	const season = new Date().getFullYear();

	const player = await findPlayerById(playerId);
	if (!player) {
		throw new APIError(404, "Player not found", "PLAYER_NOT_FOUND");
	}

	const { current, ...playerInfo } = player;
	const [fixtureStrip, byeRounds] = await Promise.all([
		findFixturesForPlayer(player.squadId, season),
		findByeRoundsForSquad(player.squadId, season),
	]);

	res.json({
		player: playerInfo,
		current,
		fixtureStrip,
		byeRounds,
	});
}

export async function getPlayedWith(req: Request, res: Response) {
	const playerId = Number(req.params.player_id);
	const { minGames } = req.query as unknown as PlayedWithQuery;

	const result = await getPlayedWithStats(playerId, minGames);
	if (!result) {
		throw new APIError(404, "Player not found", "PLAYER_NOT_FOUND");
	}

	res.json(result);
}

export async function getPlayerHistory(req: Request, res: Response) {
	const playerId = Number(req.params.player_id);
	const { includePreseason } = req.query as unknown as PlayerHistoryQuery;

	const player = await findPlayerById(playerId);
	if (!player) {
		throw new APIError(404, "Player not found", "PLAYER_NOT_FOUND");
	}

	const history = await findPlayerHistoryById(playerId, includePreseason);
	res.json(history);
}
