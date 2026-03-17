import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchCasualtyWardMock = vi.fn();
const transactionMock = vi.fn();
const eqMock = vi.fn((...args) => ({ op: "eq", args }));
const inArrayMock = vi.fn((...args) => ({ op: "inArray", args }));
const andMock = vi.fn((...args) => ({ op: "and", args }));
const notMock = vi.fn((arg) => ({ op: "not", arg }));

const loggerInfoMock = vi.fn();
const loggerWarnMock = vi.fn();
const loggerErrorMock = vi.fn();

vi.mock("@src/worker/upstream/client", () => ({
	fetchCasualtyWard: fetchCasualtyWardMock,
}));

vi.mock("@database/data-source", () => ({
	default: {
		transaction: transactionMock,
	},
}));

vi.mock("@database/schema", () => ({
	casualtyWard: {
		competitionId: "competition_id_col",
		playerUrl: "player_url_col",
	},
}));

vi.mock("drizzle-orm", () => ({
	eq: eqMock,
	inArray: inArrayMock,
	and: andMock,
	not: notMock,
}));

vi.mock("@src/logic/shared/utils/logger", () => ({
	default: {
		info: loggerInfoMock,
		warn: loggerWarnMock,
		error: loggerErrorMock,
	},
}));

describe("syncCasualtyWard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("upserts normalized casualty rows and prunes stale rows", async () => {
		const onConflictDoUpdateMock = vi.fn().mockResolvedValue(undefined);
		const valuesMock = vi.fn(() => ({
			onConflictDoUpdate: onConflictDoUpdateMock,
		}));
		const insertMock = vi.fn(() => ({ values: valuesMock }));
		const whereMock = vi.fn().mockResolvedValue(undefined);
		const deleteMock = vi.fn(() => ({ where: whereMock }));

		transactionMock.mockImplementation(async (cb) =>
			cb({
				insert: insertMock,
				delete: deleteMock,
			}),
		);

		fetchCasualtyWardMock.mockResolvedValue({
			selectedCompetitionId: 111,
			casualties: [
				{
					firstName: "Mitchell",
					lastName: "Woods",
					expectedReturn: "Round 4",
					imageUrl: "/remote.axd?http://example.com/player.png",
					injury: "Hamstring",
					teamNickname: "Bulldogs",
					url: " https://www.nrl.com/players/nrl-premiership/bulldogs/mitchell-woods/ ",
				},
				{
					firstName: "No",
					lastName: "Url",
					expectedReturn: "Round 9",
					imageUrl: null,
					injury: "Knee",
					teamNickname: "Bulldogs",
					url: "   ",
				},
			],
		});

		const { syncCasualtyWard } = await import(
			"@src/worker/syncers/casualty.syncer"
		);

		const count = await syncCasualtyWard();

		expect(count).toBe(1);
		expect(fetchCasualtyWardMock).toHaveBeenCalledTimes(1);
		expect(insertMock).toHaveBeenCalledTimes(1);
		expect(valuesMock).toHaveBeenCalledWith(
			expect.objectContaining({
				competitionId: 111,
				playerUrl:
					"https://www.nrl.com/players/nrl-premiership/bulldogs/mitchell-woods/",
				firstName: "Mitchell",
				lastName: "Woods",
				teamNickname: "Bulldogs",
				injury: "Hamstring",
				expectedReturn: "Round 4",
			}),
		);
		expect(onConflictDoUpdateMock).toHaveBeenCalledTimes(1);
		expect(deleteMock).toHaveBeenCalledTimes(1);
		expect(whereMock).toHaveBeenCalledTimes(1);
		expect(eqMock).toHaveBeenCalledWith("competition_id_col", 111);
		expect(inArrayMock).toHaveBeenCalledWith("player_url_col", [
			"https://www.nrl.com/players/nrl-premiership/bulldogs/mitchell-woods/",
		]);
		expect(notMock).toHaveBeenCalledTimes(1);
		expect(andMock).toHaveBeenCalledTimes(1);
	});

	it("deletes all rows for competition when upstream casualties are empty", async () => {
		const insertMock = vi.fn(() => ({
			values: vi.fn(() => ({
				onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
			})),
		}));
		const whereMock = vi.fn().mockResolvedValue(undefined);
		const deleteMock = vi.fn(() => ({ where: whereMock }));

		transactionMock.mockImplementation(async (cb) =>
			cb({
				insert: insertMock,
				delete: deleteMock,
			}),
		);

		fetchCasualtyWardMock.mockResolvedValue({
			selectedCompetitionId: 161,
			casualties: [],
		});

		const { syncCasualtyWard } = await import(
			"@src/worker/syncers/casualty.syncer"
		);

		const count = await syncCasualtyWard();

		expect(count).toBe(0);
		expect(insertMock).not.toHaveBeenCalled();
		expect(deleteMock).toHaveBeenCalledTimes(1);
		expect(whereMock).toHaveBeenCalledTimes(1);
		expect(eqMock).toHaveBeenCalledWith("competition_id_col", 161);
		expect(andMock).not.toHaveBeenCalled();
		expect(inArrayMock).not.toHaveBeenCalled();
		expect(notMock).not.toHaveBeenCalled();
	});
});
