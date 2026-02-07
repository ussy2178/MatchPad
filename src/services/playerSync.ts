import { db } from '../db/db';
import { supabase } from '../lib/supabase';

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
    const payload = players.map(p => ({
      id: p.id,
      name: p.name,
      team_id: p.teamId,
      jersey_number: p.jerseyNumber,
      position: p.position
    }));

    // 3. Upsert to Supabase
    // Using upsert with { onConflict: 'id' } to avoid duplicates
    // Chunking might be needed if too many players, but for now sending all at once.
    // Supabase handles reasonably large payloads.

    const { error } = await supabase
      .from('football_players')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn("Supabase player sync failed:", error);
    } else {
      console.log(`Synced ${players.length} players to Supabase.`);
    }

  } catch (err) {
    // Catch-all to prevent app crash
    console.warn("Supabase player sync crashed:", err);
  }
}
