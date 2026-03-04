import { Router } from "express";
import { z } from "zod";
import validate from "@src/logic/shared/middleware/validation.middleware";
import {
	getLiveRounds,
	getLiveRoundDetail,
	getLiveRoundStats,
	getPlayerStats,
} from "./live.controller";

const router = Router();

// GET /api/live — all rounds summary + active round detail
router.get("/", getLiveRounds);

// GET /api/live/round/:round_id — specific round detail
router.get(
	"/round/:round_id",
	validate({
		params: z.object({
			round_id: z.coerce.number().int().positive(),
		}),
	}),
	getLiveRoundDetail,
);

// GET /api/live/stats/:round_id — player stats for a round
router.get(
	"/stats/:round_id",
	validate({
		params: z.object({
			round_id: z.coerce.number().int().positive(),
		}),
	}),
	getLiveRoundStats,
);

// GET /api/live/player/:player_id — player stats across all rounds
router.get(
	"/player/:player_id",
	validate({
		params: z.object({
			player_id: z.coerce.number().int().positive(),
		}),
	}),
	getPlayerStats,
);

export default router;
