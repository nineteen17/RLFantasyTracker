import dotenv from "dotenv";
dotenv.config();

import logger from "@src/logic/shared/utils/logger";
import { runFullSync } from "./syncService";

async function main() {
	try {
		logger.info("NRL Fantasy Full Sync - Manual Run");
		const result = await runFullSync();

		logger.info("Sync completed successfully:");
		logger.info(`  Squads:   ${result.squads}`);
		logger.info(`  Venues:   ${result.venues}`);
		logger.info(`  Rounds:   ${result.rounds}`);
		logger.info(`  Fixtures: ${result.fixtures}`);
		logger.info(`  Players:  ${result.players}`);
		logger.info(`  Coach:    ${result.coach}`);
		logger.info(`  TeamLists:${result.teamLists}`);
		logger.info(`  Derived:  ${result.derived}`);
		logger.info(`  Duration: ${result.durationMs}ms`);

		process.exit(0);
	} catch (error) {
		logger.error(
			`Sync failed: ${error instanceof Error ? error.message : String(error)}`,
		);
		if (error instanceof Error && error.stack) {
			logger.error(error.stack);
		}
		process.exit(1);
	}
}

main();
