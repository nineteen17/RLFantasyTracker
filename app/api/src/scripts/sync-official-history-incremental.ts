import dotenv from "dotenv";
dotenv.config();

import logger from "@src/logic/shared/utils/logger";
import {
	runOfficialHistoryIncrementalSync,
	type OfficialHistorySyncOptions,
} from "@src/worker/history/official-history.incremental";

function parsePositiveInt(value: string | undefined): number | undefined {
	if (!value) return undefined;
	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
	return parsed;
}

function parseArgs(argv: string[]): OfficialHistorySyncOptions {
	const options: OfficialHistorySyncOptions = {};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		const next = argv[i + 1];

		switch (arg) {
			case "--dry-run":
				options.dryRun = true;
				break;
			case "--lookback-rounds":
				options.lookbackRounds = parsePositiveInt(next);
				i++;
				break;
			case "--target-round":
				options.targetRoundId = parsePositiveInt(next);
				i++;
				break;
			case "--delay-ms": {
				const parsed = parsePositiveInt(next);
				if (parsed != null) options.delayMs = parsed;
				i++;
				break;
			}
			default:
				if (arg.startsWith("--")) {
					throw new Error(`Unknown argument: ${arg}`);
				}
		}
	}

	return options;
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	options.reason = "manual";

	logger.info(
		`Starting official incremental history sync (dryRun=${options.dryRun ? "true" : "false"})`,
	);
	const result = await runOfficialHistoryIncrementalSync(options);
	logger.info(`Official incremental history sync finished: ${JSON.stringify(result)}`);

	if (result.status === "failed") {
		process.exitCode = 1;
	}
}

main().catch((error) => {
	logger.error(
		`Official incremental history sync crashed: ${error instanceof Error ? error.message : String(error)}`,
	);
	if (error instanceof Error && error.stack) {
		logger.error(error.stack);
	}
	process.exit(1);
});
