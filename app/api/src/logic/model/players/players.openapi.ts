import { STATUS } from "@src/logic/shared/utils/errors/errorMessages";
import type { OpenAPIRoute } from "@src/config/openapi/openapi.helper";
import {
	searchQuerySchema,
	playerIdParamSchema,
	playerHistoryQuerySchema,
	playedWithQuerySchema,
	SearchResultSchema,
	SearchResponseSchema,
	PlayerCurrentSchema,
	PlayerDetailResponseSchema,
	PlayerHistoryResponseSchema,
	PlayedWithResponseSchema,
} from "@nrl/types";

export const PLAYERS_OPENAPI_SCHEMAS = {
	SearchResult: SearchResultSchema,
	PlayerCurrent: PlayerCurrentSchema,
	PlayerHistoryResponse: PlayerHistoryResponseSchema,
	PlayedWithResponse: PlayedWithResponseSchema,
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
	PLAYED_WITH: {
		method: "get",
		path: "/api/players/{player_id}/played-with",
		summary: "Get teammate impact stats — average points when playing with each teammate",
		tags: ["Players"],
		request: { params: playerIdParamSchema, query: playedWithQuerySchema },
		errorResponses: [
			{ title: "PLAYER_NOT_FOUND", message: "Player not found", status: STATUS.NOT_FOUND },
		],
		successResponse: {
			status: STATUS.OK,
			schema: PlayedWithResponseSchema,
		},
	},
	GET_PLAYER_HISTORY: {
		method: "get",
		path: "/api/players/{player_id}/history",
		summary: "Get full historical player match stats from local history store",
		tags: ["Players"],
		request: { params: playerIdParamSchema, query: playerHistoryQuerySchema },
		errorResponses: [
			{ title: "PLAYER_NOT_FOUND", message: "Player not found", status: STATUS.NOT_FOUND },
		],
		successResponse: {
			status: STATUS.OK,
			schema: PlayerHistoryResponseSchema,
		},
	},
};
