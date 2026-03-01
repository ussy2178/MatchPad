import { useEffect, useState } from 'react';
import { type Player } from '../db/db';
import { normalizeTeamId } from '../utils/idUtils';
import {
  addPlayerToSupabase,
  deletePlayerFromSupabase,
  fetchPlayersByTeam,
  importPlayersToSupabase,
  onPlayersUpdated,
  updatePlayerInSupabase,
} from '../services/players';

export function usePlayers(teamId: string) {
  const normalizedId = normalizeTeamId(teamId);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!normalizedId) {
      setPlayers([]);
      return;
    }

    let mounted = true;
    const load = async () => {
      const fetched = await fetchPlayersByTeam(normalizedId);
      if (mounted) setPlayers(fetched);
    };
    load();

    const unsub = onPlayersUpdated(() => {
      load();
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [normalizedId]);

  return players;
}

export const playerService = {
  async addPlayer(player: Omit<Player, 'id'>) {
    return addPlayerToSupabase(player);
  },

  async updatePlayer(id: string, updates: Partial<Player>) {
    await updatePlayerInSupabase(id, updates);
  },

  async deletePlayer(id: string) {
    await deletePlayerFromSupabase(id);
  },

  async importPlayers(teamId: string, players: Omit<Player, 'id' | 'teamId'>[]) {
    await importPlayersToSupabase(teamId, players);
  }
};
