import type { Request, Response } from "express";
import { findAllVenues } from "./venues.repository";

export async function listVenues(_req: Request, res: Response) {
	const data = await findAllVenues();
	res.json({ data });
}
