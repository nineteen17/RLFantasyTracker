import "reflect-metadata";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const envTestPath = path.resolve(__dirname, "../.env.test");

if (fs.existsSync(envTestPath)) {
	dotenv.config({ path: envTestPath });
}

process.env.NODE_ENV ??= "test";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";
process.env.JWT_ACCESS_EXPIRATION ??= "1h";
