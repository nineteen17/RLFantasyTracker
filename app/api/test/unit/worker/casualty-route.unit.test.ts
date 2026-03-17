import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { CasualtyWardQuerySchema } from "@src/logic/model/casualty/casualty.openapi";

const { findCasualtyWardEntriesMock } = vi.hoisted(() => ({
	findCasualtyWardEntriesMock: vi.fn(),
}));

vi.mock("@src/logic/model/casualty/casualty.repository", () => ({
	findCasualtyWardEntries: findCasualtyWardEntriesMock,
}));

describe("casualty ward route", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("parses filter queries and forwards normalized filters", async () => {
		const parsed = CasualtyWardQuerySchema.safeParse({
			competition: "111",
			team: "Bulldogs",
			expectedReturn: "Round 4",
		});
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;

		findCasualtyWardEntriesMock.mockResolvedValue([
			{
				competitionId: 111,
				playerUrl: "https://www.nrl.com/players/nrl-premiership/bulldogs/mitchell-woods/",
				firstName: "Mitchell",
				lastName: "Woods",
				teamNickname: "Bulldogs",
				injury: "Hamstring",
				expectedReturn: "Round 4",
				imageUrl: null,
				sourceUpdatedAt: "2026-03-17T00:00:00.000Z",
				updatedAt: "2026-03-17T00:00:00.000Z",
			},
		]);

		const req = {
			query: parsed.data,
		} as unknown as Request;

		const jsonMock = vi.fn();
		const res = {
			json: jsonMock,
		} as unknown as Response;

		const { listCasualtyWard } = await import(
			"@src/logic/model/casualty/casualty.controller"
		);
		await listCasualtyWard(req, res);

		expect(findCasualtyWardEntriesMock).toHaveBeenCalledWith({
			competition: 111,
			team: "Bulldogs",
			expectedReturn: "Round 4",
		});
		expect(jsonMock).toHaveBeenCalledWith({
			data: expect.arrayContaining([
				expect.objectContaining({
					firstName: "Mitchell",
					lastName: "Woods",
					teamNickname: "Bulldogs",
				}),
			]),
		});
	});

	it("rejects invalid competition query values", async () => {
		const parsed = CasualtyWardQuerySchema.safeParse({
			competition: "0",
		});

		expect(parsed.success).toBe(false);
		expect(findCasualtyWardEntriesMock).not.toHaveBeenCalled();
	});
});
