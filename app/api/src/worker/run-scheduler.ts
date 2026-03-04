import dotenv from "dotenv";
import logger from "@src/logic/shared/utils/logger";
import { startScheduler, stopScheduler } from "./scheduler";

dotenv.config();

logger.info("Starting standalone scheduler worker");
startScheduler();

const shutdown = (signal: string) => {
	logger.info(`Received ${signal}, stopping scheduler worker`);
	stopScheduler();
	process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
