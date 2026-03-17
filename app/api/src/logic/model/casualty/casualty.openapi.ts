import { z } from "zod";
import { STATUS } from "@src/logic/shared/utils/errors/errorMessages";
import type { OpenAPIRoute } from "@src/config/openapi/openapi.helper";

export const CasualtyWardEntrySchema = z.object({
	competitionId: z.number().int().positive(),
	playerUrl: z.string().url(),
	firstName: z.string(),
	lastName: z.string(),
	teamNickname: z.string(),
	injury: z.string(),
	expectedReturn: z.string(),
	imageUrl: z.string().nullable(),
	sourceUpdatedAt: z.string(),
	updatedAt: z.string().nullable(),
});

export const CasualtyWardResponseSchema = z.object({
	data: z.array(CasualtyWardEntrySchema),
});

export const CasualtyWardQuerySchema = z.object({
	competition: z.coerce.number().int().positive().optional(),
	team: z.string().trim().min(1).optional(),
	expectedReturn: z.string().trim().min(1).optional(),
});

export const CASUALTY_OPENAPI_SCHEMAS: Record<string, unknown> = {
	CasualtyWardEntry: CasualtyWardEntrySchema,
	CasualtyWardResponse: CasualtyWardResponseSchema,
};

export const CASUALTY_OPENAPI_ROUTES: Record<string, OpenAPIRoute> = {
	LIST_CASUALTY_WARD: {
		method: "get",
		path: "/api/casualty-ward",
		summary: "List casualty ward entries with optional filters",
		tags: ["Casualty"],
		request: { query: CasualtyWardQuerySchema },
		errorResponses: [],
		successResponse: {
			status: STATUS.OK,
			schema: CasualtyWardResponseSchema,
		},
	},
};
