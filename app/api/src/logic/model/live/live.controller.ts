import type { Request, Response } from "express";
import { APIError } from "@src/logic/shared/utils/errors/APIError";
import {
	fetchLiveRounds,
	fetchLiveRound,
	fetchLiveRoundStats,
	fetchPlayerRoundStats,
	fetchRoundTeamLists,
} from "./live.repository";

export async function getLiveRounds(_req: Request, res: Response) {
	const data = await fetchLiveRounds();
	res.json(data);
}

export async function getLiveRoundDetail(req: Request, res: Response) {
	const roundId = Number(req.params.round_id);
	const includeTeamLists =
		String(req.query.includeTeamLists ?? "").toLowerCase() === "true";
	const round = await fetchLiveRound(roundId, includeTeamLists);

	if (!round) {
		throw new APIError(404, "Round not found", "ROUND_NOT_FOUND");
	}

	res.json(round);
}

export async function getLiveRoundTeamLists(req: Request, res: Response) {
	const roundId = Number(req.params.round_id);
	const data = await fetchRoundTeamLists(roundId);
	res.json(data);
}

export async function getLiveRoundStats(req: Request, res: Response) {
	const roundId = Number(req.params.round_id);
	const stats = await fetchLiveRoundStats(roundId);
	res.json(stats);
}

export async function getPlayerStats(req: Request, res: Response) {
	const playerId = Number(req.params.player_id);
	const stats = await fetchPlayerRoundStats(playerId);
	res.json({ playerId, rounds: stats });
}
