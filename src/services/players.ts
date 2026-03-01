import type { Player } from '../db/db';
import { J1_TEAMS } from '../db/seeds';
import { supabase } from '../lib/supabase';
import { normalizePosition, normalizeTeamId } from '../utils/idUtils';

const PLAYERS_CACHE_KEY = 'matchpad:playersCache:v1';
const PLAYERS_UPDATED_EVENT = 'matchpad:players-updated';

type PlayerPosition = Player['position'];

type PlayerCache = {
  updatedAt: number;
  players: Player[];
};

type FootballPlayerRow = {
  id: string;
  name: string;
  team_id: string;
  jersey_number: number;
  position: string;
};

type NewPlayerInput = Omit<Player, 'id'>;
type FootballPlayerUpsertRow = {
  team_id: string;
  jersey_number: number;
  name: string;
  position: string;
};
const UPSERT_CHUNK_SIZE = 500;

const APP_TEAM_ID_TO_DB_TEAM_ID = new Map(
  J1_TEAMS.map(team => [normalizeTeamId(team.id), normalizeTeamId(team.dbTeamId)])
);
const DB_TEAM_ID_TO_APP_TEAM_ID = new Map(
  J1_TEAMS.map(team => [normalizeTeamId(team.dbTeamId), normalizeTeamId(team.id)])
);

function resolveDbTeamId(appTeamId: string): string {
  const normalized = normalizeTeamId(appTeamId);
  return APP_TEAM_ID_TO_DB_TEAM_ID.get(normalized) ?? normalized;
}

function resolveAppTeamId(dbTeamId: string): string {
  const normalized = normalizeTeamId(dbTeamId);
  return DB_TEAM_ID_TO_APP_TEAM_ID.get(normalized) ?? normalized;
}

function mapRowToPlayer(row: FootballPlayerRow): Player {
  return {
    id: row.id,
    name: row.name,
    teamId: resolveAppTeamId(row.team_id),
    jerseyNumber: row.jersey_number,
    position: normalizePosition(row.position) as PlayerPosition,
  };
}

function mapPlayerToRow(player: Player) {
  return {
    name: player.name,
    team_id: resolveDbTeamId(player.teamId),
    jersey_number: player.jerseyNumber,
    position: normalizePosition(player.position),
  };
}

function toUpsertRow(row: {
  team_id: string;
  jersey_number: number | null | undefined;
  name: string;
  position: string;
}): FootballPlayerUpsertRow | null {
  if (row.jersey_number == null || !Number.isFinite(row.jersey_number)) {
    if (import.meta.env.DEV) {
      console.warn('[players] skipped row with null jersey_number', row);
    }
    return null;
  }
  return {
    team_id: normalizeTeamId(row.team_id),
    jersey_number: row.jersey_number,
    name: row.name,
    position: normalizePosition(row.position),
  };
}

async function upsertFootballPlayersRows(
  rows: FootballPlayerUpsertRow[],
  context: string
): Promise<void> {
  if (rows.length === 0) return;

  for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE);
    const { error } = await supabase
      .from('football_players')
      .upsert(chunk, {
        onConflict: 'team_id,jersey_number',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error(`[players] upsert failed (${context})`, {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        sampleRows: chunk.slice(0, 5).map(r => ({
          team_id: r.team_id,
          jersey_number: r.jersey_number,
          name: r.name,
        })),
      });
      throw error;
    }
  }
}

function readPlayersCache(): Player[] {
  try {
    const raw = localStorage.getItem(PLAYERS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlayerCache;
    if (!Array.isArray(parsed.players)) return [];
    return parsed.players;
  } catch (e) {
    console.warn('[players] failed to read cache', e);
    return [];
  }
}

function writePlayersCache(players: Player[]): void {
  try {
    const payload: PlayerCache = {
      updatedAt: Date.now(),
      players,
    };
    localStorage.setItem(PLAYERS_CACHE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('[players] failed to write cache', e);
  }
}

function notifyPlayersUpdated(): void {
  window.dispatchEvent(new Event(PLAYERS_UPDATED_EVENT));
}

function filterPlayersByTeamIds(players: Player[], teamIds: string[]): Record<string, Player[]> {
  const normalizedIds = teamIds.map(id => normalizeTeamId(id));
  const result: Record<string, Player[]> = {};
  for (const id of normalizedIds) {
    result[id] = [];
  }
  for (const player of players) {
    if (result[player.teamId]) result[player.teamId].push(player);
  }
  for (const id of normalizedIds) {
    result[id].sort((a, b) => a.jerseyNumber - b.jerseyNumber);
  }
  return result;
}

async function fetchPlayersFromSupabaseByDbTeamIds(dbTeamIds: string[]): Promise<Player[]> {
  if (import.meta.env.DEV) {
    console.log('[players] fetch request', { dbTeamIds });
  }

  const { data, error } = await supabase
    .from('football_players')
    .select('id, name, team_id, jersey_number, position')
    .in('team_id', dbTeamIds)
    .order('team_id', { ascending: true })
    .order('jersey_number', { ascending: true });

  if (error) {
    console.warn('[players] supabase fetch error', {
      dbTeamIds,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw error;
  }

  if (import.meta.env.DEV) {
    console.log('[players] supabase fetch result', {
      dbTeamIds,
      count: data?.length ?? 0,
    });
  }

  const players = ((data ?? []) as FootballPlayerRow[]).map(mapRowToPlayer);
  if (import.meta.env.DEV) {
    console.log('[players] loaded from supabase', players.length);
  }
  return players;
}

export async function fetchPlayersByTeams(teamIds: string[]): Promise<Record<string, Player[]>> {
  if (teamIds.length === 0) return {};
  const normalizedTeamIds = teamIds.map(id => normalizeTeamId(id));
  const dbTeamIds = [...new Set(normalizedTeamIds.map(resolveDbTeamId))];

  try {
    if (import.meta.env.DEV) {
      console.log('[players] fetchPlayersByTeams', {
        teamIds: normalizedTeamIds,
        dbTeamIds,
      });
    }

    const players = await fetchPlayersFromSupabaseByDbTeamIds(dbTeamIds);
    const grouped = filterPlayersByTeamIds(players, normalizedTeamIds);

    const cachedAll = readPlayersCache();
    const cachedWithoutRequestedTeams = cachedAll.filter(
      player => !normalizedTeamIds.includes(normalizeTeamId(player.teamId))
    );
    writePlayersCache([...cachedWithoutRequestedTeams, ...players]);

    return grouped;
  } catch (e) {
    console.warn('[players] fetchPlayersByTeams fallback', {
      teamIds: normalizedTeamIds,
      dbTeamIds,
    });
    const cached = readPlayersCache();
    if (cached.length > 0) {
      console.warn('[players] supabase failed, showing cache', e);
      if (import.meta.env.DEV) console.log('[players] loaded from cache', cached.length);
      return filterPlayersByTeamIds(cached, teamIds);
    }
    console.warn('[players] supabase failed and cache empty', e);
    return filterPlayersByTeamIds([], teamIds);
  }
}

export async function fetchPlayersByTeam(teamId: string): Promise<Player[]> {
  if (import.meta.env.DEV) {
    console.log('[players] fetchPlayersByTeam', {
      teamId,
      dbTeamId: resolveDbTeamId(teamId),
    });
  }
  const grouped = await fetchPlayersByTeams([teamId]);
  return grouped[normalizeTeamId(teamId)] ?? [];
}

export function onPlayersUpdated(listener: () => void): () => void {
  window.addEventListener(PLAYERS_UPDATED_EVENT, listener);
  return () => window.removeEventListener(PLAYERS_UPDATED_EVENT, listener);
}

export async function addPlayerToSupabase(input: NewPlayerInput): Promise<Player> {
  const player: Player = {
    ...input,
    teamId: normalizeTeamId(input.teamId),
    position: normalizePosition(input.position) as PlayerPosition,
    id: crypto.randomUUID(),
  };

  const row = toUpsertRow(mapPlayerToRow(player));
  if (row) {
    await upsertFootballPlayersRows([row], 'addPlayerToSupabase');
  }

  await fetchPlayersByTeam(player.teamId);
  notifyPlayersUpdated();
  return player;
}

export async function updatePlayerInSupabase(id: string, updates: Partial<Player>): Promise<void> {
  const payload: Partial<FootballPlayerRow> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.teamId !== undefined) payload.team_id = resolveDbTeamId(updates.teamId);
  if (updates.jerseyNumber !== undefined) payload.jersey_number = updates.jerseyNumber;
  if (updates.position !== undefined) payload.position = normalizePosition(updates.position);

  const { error } = await supabase
    .from('football_players')
    .update(payload)
    .eq('id', id);
  if (error) throw error;

  await fetchPlayersByTeams(J1_TEAMS.map(team => team.id));
  notifyPlayersUpdated();
}

export async function deletePlayerFromSupabase(id: string): Promise<void> {
  const { error } = await supabase
    .from('football_players')
    .delete()
    .eq('id', id);
  if (error) throw error;

  await fetchPlayersByTeams(J1_TEAMS.map(team => team.id));
  notifyPlayersUpdated();
}

export async function importPlayersToSupabase(teamId: string, players: Omit<Player, 'id' | 'teamId'>[]): Promise<void> {
  const normalizedTeamId = normalizeTeamId(teamId);
  const dbTeamId = resolveDbTeamId(normalizedTeamId);

  const rows = players.map(player => {
    return toUpsertRow({
      name: player.name,
      team_id: dbTeamId,
      jersey_number: player.jerseyNumber,
      position: normalizePosition(player.position),
    });
  }).filter((row): row is FootballPlayerUpsertRow => row !== null);

  if (rows.length === 0) return;

  await upsertFootballPlayersRows(rows, 'importPlayersToSupabase');

  await fetchPlayersByTeam(normalizedTeamId);
  notifyPlayersUpdated();
}
