import { STATUS } from "@src/logic/shared/utils/errors/errorMessages";
import type { OpenAPIRoute } from "@src/config/openapi/openapi.helper";
import {
	searchQuerySchema,
	playerIdParamSchema,
	SearchResultSchema,
	SearchResponseSchema,
	PlayerCurrentSchema,
	PlayerDetailResponseSchema,
} from "@nrl/types";

export const PLAYERS_OPENAPI_SCHEMAS = {
	SearchResult: SearchResultSchema,
	PlayerCurrent: PlayerCurrentSchema,
};

export const PLAYERS_OPENAPI_ROUTES: Record<string, OpenAPIRoute> = {
	SEARCH: {
		method: "get",
		path: "/api/players/search",
		summary: "Search players with filters and pagination",
		tags: ["Players"],
		request: { query: searchQuerySchema },
		errorResponses: [],
		successResponse: {
			status: STATUS.OK,
			schema: SearchResponseSchema,
		},
	},
	GET_PLAYER: {
		method: "get",
		path: "/api/players/{player_id}",
		summary: "Get full player detail with current stats and fixture strip",
		tags: ["Players"],
		request: { params: playerIdParamSchema },
		errorResponses: [
			{ title: "PLAYER_NOT_FOUND", message: "Player not found", status: STATUS.NOT_FOUND },
		],
		successResponse: {
			status: STATUS.OK,
			schema: PlayerDetailResponseSchema,
		},
	},
};
