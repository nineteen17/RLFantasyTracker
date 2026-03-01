import type { Request, Response } from "express";
import { APIError } from "@src/logic/shared/utils/errors/APIError";
import {
	findAllSquads,
	findSquadById,
	findRosterBySquadId,
	findFixturesBySquadId,
} from "./teams.repository";

export async function listTeams(_req: Request, res: Response) {
	const data = await findAllSquads();
	res.json({ data });
}

export async function getTeam(req: Request, res: Response) {
	const squadId = Number(req.params.squad_id);
	const season = new Date().getFullYear();

	const squad = await findSquadById(squadId);
	if (!squad) {
		throw new APIError(404, "Team not found", "TEAM_NOT_FOUND");
	}

	const [roster, fixtureStrip] = await Promise.all([
		findRosterBySquadId(squadId),
		findFixturesBySquadId(squadId, season),
	]);

	res.json({ data: { ...squad, roster, fixtureStrip } });
}
