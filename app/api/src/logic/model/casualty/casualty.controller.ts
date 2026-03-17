import type { Request, Response } from "express";
import {
	findCasualtyWardEntries,
	type CasualtyWardFilters,
} from "./casualty.repository";

export async function listCasualtyWard(req: Request, res: Response) {
	const filters: CasualtyWardFilters = {
		competition:
			typeof req.query.competition === "number"
				? req.query.competition
				: undefined,
		team: typeof req.query.team === "string" ? req.query.team : undefined,
		expectedReturn:
			typeof req.query.expectedReturn === "string"
				? req.query.expectedReturn
				: undefined,
	};

	const data = await findCasualtyWardEntries(filters);
	res.json({ data });
}
