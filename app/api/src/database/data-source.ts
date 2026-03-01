import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is required");
}

const pool = new pg.Pool({
	connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, {
	schema,
	logger: process.env.NODE_ENV !== "production",
});

export type Database = typeof db;

export default db;
