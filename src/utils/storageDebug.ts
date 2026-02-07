import { db } from '../db/db';

/**
 * Normalizes a team name to a canonical ID.
 * Rules:
 * - Trim whitespace
 * - Convert full-width spaces to half-width
 * - Lowercase
 * - Replace spaces with "-"
 * - Remove special characters (except hyphens)
 */
export function normalizeTeamId(name: string): string {
  return name
    .trim()
    .replace(/　/g, ' ') // Full-width space to half-width
    .toLowerCase()
    .replace(/\s+/g, '-') // Spaces to hyphens
    .replace(/[^a-z0-9-]/g, ''); // Remove non-alphanumeric (except hyphen)
}

/**
 * Scans localStorage and Dexie for player data to debug inconsistencies.
 */
export async function debugTeamStorage() {
  console.group('Team Storage Debug');

  // 1. Scan LocalStorage
  console.group('LocalStorage Scan');
  const lsKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('player') || key.includes('team'))) {
      lsKeys.push(key);
      const value = localStorage.getItem(key);
      let parsed = value;
      try {
        parsed = JSON.parse(value || 'null');
      } catch (e) {
        // raw string
      }
      console.log(`Key: "${key}"`, parsed);
    }
  }
  if (lsKeys.length === 0) {
    console.log('No player/team related keys found in LocalStorage.');
  }
  console.groupEnd();

  // 2. Scan Dexie (IndexedDB)
  console.group('IndexedDB (Dexie) Scan');
  try {
    const teams = await db.teams.toArray();
    console.log('Teams in DB:', teams);

    const matchCounts = await db.players.count();
    console.log('Total Players in DB:', matchCounts);

    // Check specific problematic team if known, or just sample
    // We'll check counts per team
    const players = await db.players.toArray();
    const teamCounts: Record<string, number> = {};
    players.forEach(p => {
      teamCounts[p.teamId] = (teamCounts[p.teamId] || 0) + 1;
    });
    console.log('Player Counts per TeamId:', teamCounts);

  } catch (e) {
    console.error('Failed to scan Dexie:', e);
  }
  console.groupEnd();

  console.groupEnd();
}
