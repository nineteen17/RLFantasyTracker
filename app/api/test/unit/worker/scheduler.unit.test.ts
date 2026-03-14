import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchUpstreamMock = vi.fn();
const runFullSyncMock = vi.fn();
const runLightSyncMock = vi.fn();
const runOfficialHistoryIncrementalSyncMock = vi.fn();
const cronScheduleMock = vi.fn();

vi.mock("node-cron", () => ({
	default: {
		schedule: cronScheduleMock,
	},
}));

vi.mock("@src/logic/shared/utils/logger", () => ({
	default: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock("@src/worker/upstream/client", () => ({
	fetchUpstream: fetchUpstreamMock,
}));

vi.mock("@src/worker/syncService", () => ({
	runFullSync: runFullSyncMock,
	runLightSync: runLightSyncMock,
}));

vi.mock("@src/worker/history/official-history.incremental", () => ({
	runOfficialHistoryIncrementalSync: runOfficialHistoryIncrementalSyncMock,
}));

function createRound(
	roundStatus: "active" | "complete",
	matchStatus: "playing" | "complete",
) {
	return {
		id: 1,
		status: roundStatus,
		start: "2026-03-01T00:00:00.000Z",
		end: "2026-03-07T00:00:00.000Z",
		bye_squads: [],
		is_bye: 0,
		is_final: 0,
		lifted_at: "2026-03-01T00:00:00.000Z",
		matches: [
			{
				id: 101,
				round: 1,
				match: 1,
				home_squad_id: 1,
				away_squad_id: 2,
				venue_id: 1,
				status: matchStatus,
				date: "2026-03-01T07:00:00.000Z",
				home_score: 16,
				away_score: 14,
				venue_name: "Stadium",
				home_squad_name: "Home",
				away_squad_name: "Away",
				is_postponed: 0,
				is_first: 1,
				is_last: 1,
				is_match_day: 1,
				is_margin_game: 0,
				home_squad_odds: 1.8,
				away_squad_odds: 2.0,
				home_squad_odds_id: 11,
				away_squad_odds_id: 12,
				tipping_hidden: 0,
				hashtag: "#TEST",
				clock: { p: 2, s: 4800 },
			},
		],
	};
}

describe("scheduler", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.resetModules();
		vi.clearAllMocks();
		process.env.ENABLE_HISTORY_SYNC = "true";
		delete process.env.HISTORY_SYNC_LOOKBACK_ROUNDS;
	});

	afterEach(async () => {
		const scheduler = await import("@src/worker/scheduler");
		scheduler.stopScheduler();
		vi.useRealTimers();
	});

	it("runs full sync + official history sync when active round disappears as complete", async () => {
		fetchUpstreamMock
			.mockResolvedValueOnce([createRound("active", "playing")])
			.mockResolvedValueOnce([createRound("complete", "complete")]);

		runFullSyncMock.mockResolvedValue({
			squads: 0,
			venues: 0,
			rounds: 0,
			fixtures: 0,
			players: 0,
			coach: 0,
			derived: 0,
			durationMs: 1,
		});
		runLightSyncMock.mockResolvedValue({ players: 0, coach: 0, durationMs: 1 });
		runOfficialHistoryIncrementalSyncMock.mockResolvedValue({
			status: "success",
		});

		const { startScheduler } = await import("@src/worker/scheduler");
		startScheduler();

		await vi.waitFor(() => {
			expect(fetchUpstreamMock).toHaveBeenCalledTimes(1);
		});

		await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

		await vi.waitFor(() => {
			expect(fetchUpstreamMock).toHaveBeenCalledTimes(2);
		});

		await vi.waitFor(() => {
			expect(runFullSyncMock).toHaveBeenCalledTimes(1);
			expect(runOfficialHistoryIncrementalSyncMock).toHaveBeenCalledTimes(1);
		});

		expect(runLightSyncMock).not.toHaveBeenCalled();
		expect(runOfficialHistoryIncrementalSyncMock).toHaveBeenCalledWith(
			expect.objectContaining({
				reason: "round-complete",
				targetRoundId: 1,
				lookbackRounds: 3,
			}),
		);
	});
});
