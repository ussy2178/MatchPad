import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Player } from '../db/db';
import { normalizeTeamId, normalizePosition, cleanString } from '../utils/idUtils';

export function usePlayers(teamId: string) {
  const normalizedId = normalizeTeamId(teamId);
  // Debug log as requested
  console.log("Formation query teamId:", normalizedId);

  const players = useLiveQuery(
    () => db.players.where('teamId').equals(normalizedId).sortBy('jerseyNumber'),
    [normalizedId]
  );

  if (players) {
    console.log(`Players found for ${normalizedId}:`, players.length);
  }

  return players ?? [];
}

export const playerService = {
  async addPlayer(player: Omit<Player, 'id'>) {
    const normalizedTeamId = normalizeTeamId(player.teamId);
    // Basic validation: Check if jersey number exists for this team
    const exists = await db.players
      .where({ teamId: normalizedTeamId, jerseyNumber: player.jerseyNumber })
      .first();

    if (exists) {
      throw new Error(`Jersey number ${player.jerseyNumber} is already taken in this team.`);
    }

    // Generate a simple ID logic or use UUID library. For simplicity, we can use crypto.randomUUID()
    const id = crypto.randomUUID();
    const newPlayer = { ...player, teamId: normalizedTeamId, id };
    await db.players.add(newPlayer);
    return newPlayer;
  },

  async updatePlayer(id: string, updates: Partial<Player>) {
    // Normalize teamId if present
    if (updates.teamId) {
      updates.teamId = normalizeTeamId(updates.teamId);
    }

    // If updating jersey number, check uniqueness (excluding self)
    if (updates.jerseyNumber && updates.teamId) {
      const exists = await db.players
        .where({ teamId: updates.teamId, jerseyNumber: updates.jerseyNumber })
        .filter(p => p.id !== id)
        .first();

      if (exists) {
        throw new Error(`Jersey number ${updates.jerseyNumber} is already taken in this team.`);
      }
    } else if (updates.jerseyNumber) {
      // If only jersey is updated, we need to fetch the player to know which team to check? 
      // Ideally we pass teamId in updates or fetch player first.
      // For now assume caller provides potentially necessary info or we fetch.
      const player = await db.players.get(id);
      if (player) {
        const teamId = updates.teamId || normalizeTeamId(player.teamId);
        const exists = await db.players
          .where({ teamId: teamId, jerseyNumber: updates.jerseyNumber })
          .filter(p => p.id !== id)
          .first();
        if (exists) {
          throw new Error(`Jersey number ${updates.jerseyNumber} is already taken in this team.`);
        }
      }
    }

    await db.players.update(id, updates);
  },

  async deletePlayer(id: string) {
    await db.players.delete(id);
  },

  async importPlayers(teamId: string, players: Omit<Player, 'id' | 'teamId'>[]) {
    const normalizedTeamId = normalizeTeamId(teamId);

    await db.transaction('rw', db.players, async () => {
      let insertedCount = 0;
      let skippedCount = 0;

      for (const p of players) {
        try {
          // Check for duplicate using compound index
          const exists = await db.players
            .where('[teamId+jerseyNumber]')
            .equals([normalizedTeamId, p.jerseyNumber])
            .first();

          if (exists) {
            console.warn(`Duplicate skipped: Team ${normalizedTeamId}, Jersey #${p.jerseyNumber}`);
            skippedCount++;
            continue;
          }

          await db.players.add({
            ...p,
            name: cleanString(p.name),
            position: normalizePosition(p.position) as any,
            teamId: normalizedTeamId,
            id: crypto.randomUUID()
          });
          insertedCount++;
        } catch (e) {
          console.error(`Player load error for #${p.jerseyNumber}:`, e);
        }
      }
      console.log(`Loaded ${normalizedTeamId}: ${insertedCount} inserted, ${skippedCount} skipped`);
    });
  }
};
