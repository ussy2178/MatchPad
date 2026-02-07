import { db } from '../db/db';

/**
 * Normalizes a team ID to ensure consistency.
 * Rules:
 * - Trim whitespace
 * - Lowercase
 */
export function normalizeTeamId(id: string): string {
  return id.trim().toLowerCase();
}

/**
 * Normalizes a player position (e.g. "MF", "df ", " FW") to standard format.
 */
export function normalizePosition(pos: string): string {
  return pos
    .replace(/"/g, "")
    .trim()
    .toUpperCase();
}

/**
 * Removes leading/trailing quotes and trims whitespace.
 */
export function cleanString(value: string): string {
  return value
    .replace(/^"+|"+$/g, "") // remove leading/trailing quotes
    .trim();
}

/**
 * Migration utility to fix inconsistent team IDs and malformed names in existing data.
 */
export async function fixLegacyData() {
  console.log('Running legacy data migration (IDs & Names)...');
  try {
    const players = await db.players.toArray();
    let fixedCount = 0;

    for (const p of players) {
      let dirty = false;
      const updates: any = {};

      // Fix Team ID
      const normalizedTeam = normalizeTeamId(p.teamId);
      if (p.teamId !== normalizedTeam) {
        console.log(`Fixing teamId for player ${p.name}: "${p.teamId}" -> "${normalizedTeam}"`);
        updates.teamId = normalizedTeam;
        dirty = true;
      }

      // Fix Name
      const cleanedName = cleanString(p.name);
      if (p.name !== cleanedName) {
        console.log(`Fixing name for player ${p.name}: "${p.name}" -> "${cleanedName}"`);
        updates.name = cleanedName;
        dirty = true;
      }

      if (dirty) {
        await db.players.update(p.id, updates);
        fixedCount++;
      }
    }
    console.log(`Migration complete. Fixed ${fixedCount} players.`);
  } catch (e) {
    console.error('Migration failed:', e);
  }
}
