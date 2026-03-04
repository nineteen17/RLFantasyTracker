import type { UpstreamCoachPlayersResponse } from "./types";
import logger from "@src/logic/shared/utils/logger";

const BASE_URL = "https://fantasy.nrl.com/data/nrl";

const ENDPOINTS = {
	squads: `${BASE_URL}/squads.json`,
	venues: `${BASE_URL}/venues.json`,
	rounds: `${BASE_URL}/rounds.json`,
	players: `${BASE_URL}/players.json`,
} as const;

export type EndpointKey = keyof typeof ENDPOINTS;

export async function fetchUpstream<T>(endpoint: EndpointKey): Promise<T> {
	const url = ENDPOINTS[endpoint];
	logger.info(`Fetching ${url}`);

	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(
			`HTTP ${response.status} fetching ${url}: ${response.statusText}`,
		);
	}

	const data = (await response.json()) as T;
	logger.info(
		`Fetched ${endpoint}: ${Array.isArray(data) ? data.length : "?"} records`,
	);

	return data;
}

export async function fetchCoachPlayers(): Promise<UpstreamCoachPlayersResponse> {
	const url = `${BASE_URL}/coach/players.json`;
	logger.info(`Fetching ${url}`);

	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(
			`HTTP ${response.status} fetching ${url}: ${response.statusText}`,
		);
	}

	const data = (await response.json()) as UpstreamCoachPlayersResponse;
	logger.info(`Fetched coach players: ${Object.keys(data).length} records`);

	return data;
}

/**
 * Fetch an arbitrary path under the NRL Fantasy data base URL.
 * Used for dynamic URLs like stats/{matchNumber}.json.
 */
export async function fetchUpstreamPath<T>(path: string): Promise<T> {
	const url = `${BASE_URL}/${path}`;
	logger.info(`Fetching ${url}`);

	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(
			`HTTP ${response.status} fetching ${url}: ${response.statusText}`,
		);
	}

	const data = (await response.json()) as T;
	logger.info(`Fetched ${path}: OK`);

	return data;
}
