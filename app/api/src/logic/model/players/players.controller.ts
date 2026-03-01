import type { Request, Response } from "express";
import { APIError } from "@src/logic/shared/utils/errors/APIError";
import type { SearchQuery } from "./players.schema";
import {
	searchPlayers,
	findPlayerById,
	findFixturesForPlayer,
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
	const fixtureStrip = await findFixturesForPlayer(player.squadId, season);

	res.json({
		player: playerInfo,
		current,
		fixtureStrip,
	});
}
