import { Router } from "express";
import { listVenues } from "./venues.controller";

const router = Router();

router.get("/", listVenues);

export default router;
