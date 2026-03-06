import { z } from "zod";
import { STATUS } from "@src/logic/shared/utils/errors/errorMessages";
import type { OpenAPIRoute } from "@src/config/openapi/openapi.helper";
import {
	SquadSchema,
	PlayerCardSchema,
	FixtureStripItemSchema,
	TeamsListResponseSchema,
	TeamDetailResponseSchema,
	ByePlannerTeamSchema,
	ByePlannerResponseSchema,
} from "@nrl/types";

export const TEAMS_OPENAPI_SCHEMAS: Record<string, unknown> = {
	Squad: SquadSchema,
	TeamPlayerCard: PlayerCardSchema,
	FixtureStrip: FixtureStripItemSchema,
	ByePlannerTeam: ByePlannerTeamSchema,
};

export const TEAMS_OPENAPI_ROUTES: Record<string, OpenAPIRoute> = {
	LIST_TEAMS: {
		method: "get",
		path: "/api/teams",
		summary: "List all NRL squads",
		tags: ["Teams"],
		errorResponses: [],
		successResponse: {
			status: STATUS.OK,
			schema: TeamsListResponseSchema,
		},
	},
	GET_TEAM: {
		method: "get",
		path: "/api/teams/{squad_id}",
		summary: "Get team roster and fixture strip",
		tags: ["Teams"],
		request: {
			params: z.object({
				squad_id: z.coerce.number().int().positive(),
			}),
		},
		errorResponses: [
			{ title: "TEAM_NOT_FOUND", message: "Team not found", status: STATUS.NOT_FOUND },
		],
		successResponse: {
			status: STATUS.OK,
			schema: TeamDetailResponseSchema,
		},
	},
	GET_BYE_PLANNER: {
		method: "get",
		path: "/api/teams/byes",
		summary: "Get bye planner matrix for all teams in the current season",
		tags: ["Teams"],
		errorResponses: [],
		successResponse: {
			status: STATUS.OK,
			schema: ByePlannerResponseSchema,
		},
	},
};
