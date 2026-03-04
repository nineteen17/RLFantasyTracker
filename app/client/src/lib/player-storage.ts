import type { SearchResult } from "@nrl/types";

export interface StoredPlayer {
  playerId: number;
  fullName: string;
  squadName: string | null;
  positions: number[];
  status: string | null;
  cost: number;
  avgPoints: string | null;
  updatedAt: number;
}

export type PlayerStorageInput = Pick<
  SearchResult,
  | "playerId"
  | "fullName"
  | "squadName"
  | "positions"
  | "status"
  | "cost"
  | "avgPoints"
>;

export const PLAYER_STORAGE_KEYS = {
  recent: "nrl_recent_players_v1",
  watchlist: "nrl_watchlist_players_v1",
} as const;

export const PLAYER_STORAGE_EVENT = "nrl_player_storage_change";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function toStoredPlayer(player: PlayerStorageInput): StoredPlayer {
  return {
    playerId: player.playerId,
    fullName: player.fullName,
    squadName: player.squadName,
    positions: player.positions ?? [],
    status: player.status,
    cost: player.cost,
    avgPoints: player.avgPoints,
    updatedAt: Date.now(),
  };
}

function readPlayers(key: string): StoredPlayer[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item: unknown) => item && typeof item === "object")
      .map((item) => item as Partial<StoredPlayer>)
      .filter(
        (candidate) =>
          typeof candidate.playerId === "number" &&
          typeof candidate.fullName === "string" &&
          typeof candidate.cost === "number",
      )
      .map((candidate) => ({
        playerId: candidate.playerId as number,
        fullName: candidate.fullName as string,
        squadName:
          typeof candidate.squadName === "string" ? candidate.squadName : null,
        positions: Array.isArray(candidate.positions)
          ? candidate.positions.filter(
              (value): value is number => typeof value === "number",
            )
          : [],
        status: typeof candidate.status === "string" ? candidate.status : null,
        cost: candidate.cost as number,
        avgPoints:
          typeof candidate.avgPoints === "string" ? candidate.avgPoints : null,
        updatedAt:
          typeof candidate.updatedAt === "number"
            ? candidate.updatedAt
            : Date.now(),
      }));
  } catch {
    return [];
  }
}

function writePlayers(key: string, players: StoredPlayer[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(players));
  window.dispatchEvent(
    new CustomEvent(PLAYER_STORAGE_EVENT, { detail: { key } }),
  );
}

export function getRecentPlayers(): StoredPlayer[] {
  return readPlayers(PLAYER_STORAGE_KEYS.recent);
}

export function addRecentPlayer(player: PlayerStorageInput, limit = 8) {
  const stored = toStoredPlayer(player);
  const next = [
    stored,
    ...getRecentPlayers().filter((p) => p.playerId !== stored.playerId),
  ].slice(0, limit);
  writePlayers(PLAYER_STORAGE_KEYS.recent, next);
}

export function clearRecentPlayers() {
  writePlayers(PLAYER_STORAGE_KEYS.recent, []);
}

export function getWatchlistPlayers(): StoredPlayer[] {
  return readPlayers(PLAYER_STORAGE_KEYS.watchlist);
}

export function addWatchlistPlayer(player: PlayerStorageInput) {
  const stored = toStoredPlayer(player);
  const current = getWatchlistPlayers();
  if (current.some((p) => p.playerId === stored.playerId)) return;
  writePlayers(PLAYER_STORAGE_KEYS.watchlist, [stored, ...current]);
}

export function removeWatchlistPlayer(playerId: number) {
  const next = getWatchlistPlayers().filter((p) => p.playerId !== playerId);
  writePlayers(PLAYER_STORAGE_KEYS.watchlist, next);
}

export function clearWatchlistPlayers() {
  writePlayers(PLAYER_STORAGE_KEYS.watchlist, []);
}
