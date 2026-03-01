import { Router } from "express";
import { z } from "zod";
import validate from "@src/logic/shared/middleware/validation.middleware";
import { listTeams, getTeam } from "./teams.controller";

const router = Router();

router.get("/", listTeams);

router.get(
	"/:squad_id",
	validate({
		params: z.object({
			squad_id: z.coerce.number().int().positive(),
		}),
	}),
	getTeam,
);

export default router;
