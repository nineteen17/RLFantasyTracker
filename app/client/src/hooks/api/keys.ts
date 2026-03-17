export const teamKeys = {
  all: ["teams"] as const,
  detail: (squadId: number) => ["teams", squadId] as const,
  byes: ["teams", "byes"] as const,
};

export const venueKeys = {
  all: ["venues"] as const,
};

export const liveKeys = {
  rounds: ["live", "rounds"] as const,
  round: (roundId: number, includeTeamLists = false) =>
    ["live", "round", roundId, includeTeamLists ? "with-team-lists" : "basic"] as const,
  roundStats: (roundId: number) => ["live", "stats", roundId] as const,
  playerStats: (playerId: number) => ["live", "player", playerId] as const,
};

export const playerKeys = {
  search: (filters: Record<string, unknown>) =>
    ["players", "search", filters] as const,
  detail: (playerId: number) => ["players", playerId] as const,
  history: (playerId: number, includePreseason: boolean) =>
    ["players", playerId, "history", includePreseason] as const,
  playedWith: (playerId: number) => ["players", playerId, "played-with"] as const,
};
