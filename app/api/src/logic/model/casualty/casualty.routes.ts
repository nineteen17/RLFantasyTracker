import { Router } from "express";
import validate from "@src/logic/shared/middleware/validation.middleware";
import { CasualtyWardQuerySchema } from "./casualty.openapi";
import { listCasualtyWard } from "./casualty.controller";

const router = Router();

router.get(
	"/",
	validate({
		query: CasualtyWardQuerySchema,
	}),
	listCasualtyWard,
);

export default router;
