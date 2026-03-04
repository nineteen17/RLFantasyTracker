"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PLAYER_STORAGE_EVENT,
  PLAYER_STORAGE_KEYS,
  addRecentPlayer,
  addWatchlistPlayer,
  clearRecentPlayers,
  clearWatchlistPlayers,
  getRecentPlayers,
  getWatchlistPlayers,
  removeWatchlistPlayer,
  type PlayerStorageInput,
  type StoredPlayer,
} from "@/lib/player-storage";

function useStoredPlayers(
  key: (typeof PLAYER_STORAGE_KEYS)[keyof typeof PLAYER_STORAGE_KEYS],
  getter: () => StoredPlayer[],
) {
  const [players, setPlayers] = useState<StoredPlayer[]>(() => getter());

  const refresh = useCallback(() => {
    setPlayers(getter());
  }, [getter]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      refresh();
    };

    const handleCustom = (event: Event) => {
      const custom = event as CustomEvent<{ key?: string }>;
      if (custom.detail?.key !== key) return;
      refresh();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(PLAYER_STORAGE_EVENT, handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(PLAYER_STORAGE_EVENT, handleCustom);
    };
  }, [key, refresh]);

  return { players, refresh };
}

export function useRecentPlayers() {
  const { players, refresh } = useStoredPlayers(
    PLAYER_STORAGE_KEYS.recent,
    getRecentPlayers,
  );

  const addPlayer = useCallback(
    (player: PlayerStorageInput) => {
      addRecentPlayer(player);
      refresh();
    },
    [refresh],
  );

  const clear = useCallback(() => {
    clearRecentPlayers();
    refresh();
  }, [refresh]);

  return {
    players,
    addPlayer,
    clear,
  };
}

export function useWatchlistPlayers() {
  const { players, refresh } = useStoredPlayers(
    PLAYER_STORAGE_KEYS.watchlist,
    getWatchlistPlayers,
  );

  const playerIds = useMemo(
    () => new Set(players.map((player) => player.playerId)),
    [players],
  );

  const addPlayer = useCallback(
    (player: PlayerStorageInput) => {
      addWatchlistPlayer(player);
      refresh();
    },
    [refresh],
  );

  const removePlayer = useCallback(
    (playerId: number) => {
      removeWatchlistPlayer(playerId);
      refresh();
    },
    [refresh],
  );

  const togglePlayer = useCallback(
    (player: PlayerStorageInput) => {
      if (playerIds.has(player.playerId)) {
        removeWatchlistPlayer(player.playerId);
      } else {
        addWatchlistPlayer(player);
      }
      refresh();
    },
    [playerIds, refresh],
  );

  const clear = useCallback(() => {
    clearWatchlistPlayers();
    refresh();
  }, [refresh]);

  return {
    players,
    playerIds,
    addPlayer,
    removePlayer,
    togglePlayer,
    clear,
  };
}
