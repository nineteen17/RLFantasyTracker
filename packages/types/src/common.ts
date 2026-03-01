import { z } from "zod";

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
	z.object({
		data: z.array(itemSchema),
		total: z.number(),
		limit: z.number(),
		offset: z.number(),
	});

export type PaginatedResponse<T> = {
	data: T[];
	total: number;
	limit: number;
	offset: number;
};
