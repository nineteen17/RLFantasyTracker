import { Router } from "express";
import validate from "@src/logic/shared/middleware/validation.middleware";
import { searchQuerySchema, playerIdParamSchema } from "./players.schema";
import { search, getPlayer } from "./players.controller";

const router = Router();

router.get(
	"/search",
	validate({ query: searchQuerySchema }),
	search,
);

router.get(
	"/:player_id",
	validate({ params: playerIdParamSchema }),
	getPlayer,
);

export default router;
