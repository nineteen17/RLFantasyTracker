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
import { useSearchPlayers } from "@/hooks/api/use-search-players";

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

interface UseWatchlistPlayersOptions {
  syncFromApi?: boolean;
}

export function useWatchlistPlayers(options: UseWatchlistPlayersOptions = {}) {
  const syncFromApi = options.syncFromApi ?? false;
  const { players: storedPlayers, refresh } = useStoredPlayers(
    PLAYER_STORAGE_KEYS.watchlist,
    getWatchlistPlayers,
  );
  const watchlistPlayerIds = useMemo(
    () => storedPlayers.map((player) => player.playerId),
    [storedPlayers],
  );

  const playerIds = useMemo(
    () => new Set(watchlistPlayerIds),
    [watchlistPlayerIds],
  );
  const { data: watchlistData } = useSearchPlayers(
    {
      player_ids: watchlistPlayerIds,
      limit: Math.max(watchlistPlayerIds.length, 1),
      offset: 0,
    },
    { enabled: syncFromApi && watchlistPlayerIds.length > 0 },
  );

  const players = useMemo<StoredPlayer[]>(() => {
    if (!syncFromApi) {
      return storedPlayers;
    }
    if (watchlistPlayerIds.length === 0) return [];

    const storedById = new Map(
      storedPlayers.map((player) => [player.playerId, player] as const),
    );
    const liveById = new Map(
      (watchlistData?.data ?? []).map((player) => [player.playerId, player] as const),
    );

    return watchlistPlayerIds.flatMap((playerId) => {
      const live = liveById.get(playerId);
      if (live) {
        const stored = storedById.get(playerId);
        return [
          {
            playerId: live.playerId,
            fullName: live.fullName,
            squadName: live.squadShortName ?? live.squadName,
            positions: live.positions ?? [],
            status: live.status,
            cost: live.cost,
            avgPoints: live.avgPoints,
            updatedAt: stored?.updatedAt ?? 0,
          },
        ];
      }

      const stored = storedById.get(playerId);
      return stored ? [stored] : [];
    });
  }, [storedPlayers, syncFromApi, watchlistData?.data, watchlistPlayerIds]);

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
