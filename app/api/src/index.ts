import "reflect-metadata";
import "@config/container";
import logger from "@src/logic/shared/utils/logger";
import dotenv from "dotenv";
import { container } from "tsyringe";
import { createApp } from "./app";
import db from "./database/data-source";
import fs from "fs";
import https from "node:https";
import { INJECTION_TOKENS } from "./config";
import { startScheduler } from "./worker/scheduler";

dotenv.config();

logger.info(`NODE_ENV=${process.env.NODE_ENV}`);

const NODE_ENV = process.env.NODE_ENV;
const PORT = Number(process.env.PORT || 5000);

(async () => {
	container.registerInstance(INJECTION_TOKENS.DataSource, db);
	const app = await createApp();

	const hasSSL =
		fs.existsSync("./ssl/key.pem") && fs.existsSync("./ssl/cert.pem");

	if (hasSSL) {
		const sslOptions = {
			key: fs.readFileSync("./ssl/key.pem"),
			cert: fs.readFileSync("./ssl/cert.pem"),
		};
		https.createServer(sslOptions, app).listen(PORT, "0.0.0.0", () => {
			logger.info(`Listening on https://localhost:${PORT}`);
			startScheduler();
		});
	} else {
		app.listen(PORT, "0.0.0.0", () => {
			logger.info(`Listening on http://localhost:${PORT}`);
			startScheduler();
		});
	}
})().catch((error: Error) => {
	logger.error("Startup failed:", error);
	process.exit(1);
});

export { createApp };
