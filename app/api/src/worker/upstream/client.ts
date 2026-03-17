import type {
	UpstreamCasualtyWardResponse,
	UpstreamCoachPlayersResponse,
} from "./types";
import logger from "@src/logic/shared/utils/logger";

const DEFAULT_BASE_URL = "https://fantasy.nrl.com/data/nrl";
const BASE_URL = (process.env.NRL_FANTASY_DATA_BASE_URL ?? DEFAULT_BASE_URL).replace(
	/\/+$/,
	"",
);

const ENDPOINTS = {
	squads: `${BASE_URL}/squads.json`,
	venues: `${BASE_URL}/venues.json`,
	rounds: `${BASE_URL}/rounds.json`,
	players: `${BASE_URL}/players.json`,
} as const;

const CASUALTY_WARD_BASE_URL = (
	process.env.NRL_CASUALTY_WARD_BASE_URL ?? "https://www.nrl.com"
).replace(/\/+$/, "");
const CASUALTY_WARD_COMPETITION_ID = Number.parseInt(
	process.env.NRL_CASUALTY_WARD_COMPETITION_ID ?? "111",
	10,
);
const CASUALTY_WARD_USER_AGENT =
	process.env.NRL_CASUALTY_WARD_USER_AGENT ?? "FootyBreakevensSync/1.0";

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

export async function fetchCasualtyWard(
	competitionId = CASUALTY_WARD_COMPETITION_ID,
): Promise<UpstreamCasualtyWardResponse> {
	const url = new URL("/casualty-ward/data", CASUALTY_WARD_BASE_URL);
	url.searchParams.set("competition", String(competitionId));

	logger.info(`Fetching ${url.toString()}`);

	const response = await fetch(url.toString(), {
		headers: {
			Accept: "application/json",
			"User-Agent": CASUALTY_WARD_USER_AGENT,
		},
	});

	if (!response.ok) {
		throw new Error(
			`HTTP ${response.status} fetching ${url.toString()}: ${response.statusText}`,
		);
	}

	const data = (await response.json()) as UpstreamCasualtyWardResponse;
	logger.info(`Fetched casualty ward: ${data.casualties?.length ?? 0} records`);

	return data;
}
