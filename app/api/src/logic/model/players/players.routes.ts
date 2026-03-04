import { Router } from "express";
import validate from "@src/logic/shared/middleware/validation.middleware";
import {
	searchQuerySchema,
	playerIdParamSchema,
	playerHistoryQuerySchema,
	playedWithQuerySchema,
} from "./players.schema";
import { search, getPlayer, getPlayerHistory, getPlayedWith } from "./players.controller";

const router = Router();

router.get(
	"/search",
	validate({ query: searchQuerySchema }),
	search,
);

router.get(
	"/:player_id/played-with",
	validate({ params: playerIdParamSchema, query: playedWithQuerySchema }),
	getPlayedWith,
);

router.get(
	"/:player_id",
	validate({ params: playerIdParamSchema }),
	getPlayer,
);

router.get(
	"/:player_id/history",
	validate({ params: playerIdParamSchema, query: playerHistoryQuerySchema }),
	getPlayerHistory,
);

export default router;
