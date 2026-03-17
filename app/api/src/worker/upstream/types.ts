// Upstream NRL Fantasy API JSON shapes
// Field names match the API exactly

export interface UpstreamSquad {
	id: number;
	full_name: string;
	name: string;
	short_name: string;
	avatar_version: number;
}

export interface UpstreamVenue {
	id: number;
	name: string;
	short_name: string;
	timezone: string;
}

export interface UpstreamMatch {
	id: number;
	round: number;
	match: number;
	home_squad_id: number;
	away_squad_id: number;
	venue_id: number;
	status: string;
	date: string;
	home_score: number;
	away_score: number;
	venue_name: string;
	home_squad_name: string;
	away_squad_name: string;
	is_postponed: number;
	is_first: number;
	is_last: number;
	is_match_day: number;
	is_margin_game: number;
	home_squad_odds: number;
	away_squad_odds: number;
	home_squad_odds_id: number;
	away_squad_odds_id: number;
	tipping_hidden: number;
	hashtag: string;
	clock?: { p: number; s: number };
}

/** Raw upstream stats response: Record<playerId, stat-abbreviations> */
export type UpstreamMatchStats = Record<string, Record<string, number>>;

export interface UpstreamRound {
	id: number;
	status: string;
	start: string;
	end: string;
	bye_squads: number[];
	is_bye: number;
	is_final: number;
	lifted_at: string;
	matches: UpstreamMatch[];
}

export interface UpstreamSelectionsInfo {
	c: number;
	vc: number;
	bc: number;
	res: number;
}

export interface UpstreamPlayerStats {
	prices: Record<string, number>;
	scores: Record<string, number>;
	ranks: Record<string, number>;
	season_rank: number;
	games_played: number;
	total_points: number;
	avg_points: number;
	high_score: number;
	low_score: number;
	last_3_avg: number;
	last_5_avg: number;
	selections: number;
	selections_info: UpstreamSelectionsInfo;
	owned_by: number;
	adp: number;
	proj_avg: number;
	wpr: number;
	round_wpr: Record<string, number>;
	rd_tog: string | number;
	tog: number;
	career_avg: number;
	career_avg_vs: Record<string, number>;
	last_3_proj_avg: number;
}

export interface UpstreamPlayer {
	id: number;
	first_name: string;
	last_name: string;
	squad_id: number;
	cost: number;
	status: string;
	stats: UpstreamPlayerStats;
	positions: number[];
	original_positions: number[];
	original_squad_id: number;
	transfer_round: number;
	is_bye: number;
	locked: number;
}

// Bulk coach endpoint: /coach/players.json
// Returns Record<playerId, UpstreamCoachPlayer>
export interface UpstreamCoachPlayer {
	venues: Record<string, number>;
	opponents: Record<string, number>;
	proj_scores: Record<string, number>;
	proj_prices: Record<string, number>;
	break_evens: Record<string, number>;
	be_pct: Record<string, number>;
	last_3_proj_avg: number;
	last_3_tog_avg: number;
	last_5_tog_avg: number;
	consistency: number;
	in_20_avg: number;
	out_20_avg: number;
	draft_selections: number;
	draft_selections_info: UpstreamSelectionsInfo;
	draft_owned_by: number;
	draft_owned_by_change: number;
	last_season_scores: Record<string, number>;
	transfers: Record<string, unknown>;
}

export type UpstreamCoachPlayersResponse = Record<string, UpstreamCoachPlayer>;

export interface UpstreamCasualtyWardEntry {
	firstName: string;
	lastName: string;
	expectedReturn: string;
	imageUrl: string;
	injury: string;
	teamNickname: string;
	url: string;
}

export interface UpstreamCasualtyWardResponse {
	casualties: UpstreamCasualtyWardEntry[];
	filterCompetitions?: Array<{ text: string; value: number }>;
	filterExpectedReturns?: Array<{ text: string; value: string }>;
	filterTeams?: Array<{ text: string; value: number }>;
	selectedCompetitionId?: number;
	selectedExpectedReturnValue?: string | null;
	selectedTeamId?: number | null;
}
