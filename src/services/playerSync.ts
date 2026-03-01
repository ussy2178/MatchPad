import { db } from '../db/db';
import { supabase } from '../lib/supabase';

const UPSERT_CHUNK_SIZE = 500;
type Position = 'GK' | 'DF' | 'MF' | 'FW';
type PlayerUpsert = {
  name: string;
  team_id: string;
  jersey_number: number;
  position: Position;
};

function isPosition(value: string): value is Position {
  return value === 'GK' || value === 'DF' || value === 'MF' || value === 'FW';
}

function normalizePosition(value: string): Position | null {
  const normalized = value.trim().toUpperCase();
  return isPosition(normalized) ? normalized : null;
}

/**
 * Backs up all local players to Supabase in a safe, fire-and-forget manner.
 */
export async function syncPlayersToSupabase() {
  // Guard clause: skip if Supabase client not initialized
  if (!supabase) {
    console.warn("Supabase client missing, skipping player sync.");
    return;
  }

  try {
    console.log("Starting background player sync...");

    // 1. Fetch all players from local Dexie DB
    const players = await db.players.toArray();

    if (players.length === 0) {
      console.log("No players to sync.");
      return;
    }

    // 2. Map to Supabase schema 'football_players'
    // User requested table 'football_players'.
    // Mapping:
    // id -> id
    // name -> name
    // teamId -> team_id
    // jerseyNumber -> jersey_number
    // position -> position
    const payload = players
      .map(p => {
        if (p.jerseyNumber == null || !Number.isFinite(p.jerseyNumber)) {
          return null;
        }
        const position = normalizePosition(p.position);
        if (!position) {
          return null;
        }
        return {
          name: p.name,
          team_id: p.teamId,
          jersey_number: p.jerseyNumber,
          position
        };
      })
      .filter((p): p is PlayerUpsert => p !== null);

    if (payload.length === 0) {
      console.log('No valid players to sync (all had null jersey_number).');
      return;
    }

    // 3. Upsert to Supabase
    // Using upsert with { onConflict: 'id' } to avoid duplicates
    // Chunking might be needed if too many players, but for now sending all at once.
    // Supabase handles reasonably large payloads.

    for (let i = 0; i < payload.length; i += UPSERT_CHUNK_SIZE) {
      const chunk = payload.slice(i, i + UPSERT_CHUNK_SIZE);
      const { error } = await supabase
        .from('football_players')
        .upsert(chunk, {
          onConflict: 'team_id,jersey_number',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Supabase player sync failed', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          sampleRows: chunk.slice(0, 5).map(r => ({
            team_id: r.team_id,
            jersey_number: r.jersey_number,
            name: r.name
          }))
        });
        return;
      }
    }

    console.log(`Synced ${payload.length} players to Supabase.`);

  } catch (err) {
    // Catch-all to prevent app crash
    console.warn("Supabase player sync crashed:", err);
  }
}
