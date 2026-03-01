import { supabase } from '../lib/supabase';
import { type Team, type Player, type TimerState, type EventType } from '../db/db';
import type { MatchEvent, FormationChangeEvent, TeamStampType, StampQuality } from '../types/match';
import { isSubstitutionEvent, isFormationChangeEvent, isPlayerEvent } from '../types/match';

export type { MatchEvent };

/**
 * Normalize events so every event has id and time (handles legacy TeamEvent with timestamp).
 */
export function normalizeMatchEvents(events: unknown[]): MatchEvent[] {
  return events.map((e: unknown): MatchEvent => {
    const ev = e as Record<string, unknown>;
    if (ev.type === 'team') {
      const time = typeof ev.time === 'number' ? ev.time : (typeof ev.timestamp === 'number' ? ev.timestamp : 0);
      const id = typeof ev.id === 'string' ? ev.id : crypto.randomUUID();
      return {
        id,
        time,
        type: 'team',
        team: ev.team as 'home' | 'away',
        stamp: ev.stamp as TeamStampType,
        ...(ev.quality != null ? { quality: ev.quality as StampQuality } : {}),
        ...(ev.comment != null && ev.comment !== '' ? { comment: String(ev.comment) } : {}),
      };
    }
    return e as MatchEvent;
  });
}

export interface PlayerStats {
  name: string;
  counts: {
    pass: number;
    shot: number;
    defense: number;
    goal: number;
    [key: string]: number;
  };
}

export interface WatchModeState {
  matchId: string;
  homeTeam: Team;
  awayTeam: Team;
  homePlayers: Player[];
  awayPlayers: Player[];
  /** Initial/starting lineups (source for replay). */
  initialHomeLineup?: { [key: number]: string };
  initialAwayLineup?: { [key: number]: string };
  /** Current lineups (for backward compat; prefer computing from initial + events). */
  homeLineup: { [key: number]: string };
  awayLineup: { [key: number]: string };
  /** Optional bench player IDs. If empty/absent, substitutions can select from any non-active team player. */
  homeBench?: string[];
  awayBench?: string[];
  homeFormation: string;
  awayFormation: string;
  timerState?: TimerState;
  events: MatchEvent[];
  /** Per-match team colors (player marker border). */
  homeTeamColor?: string;
  awayTeamColor?: string;
}

export interface MatchNotes {
  firstHalf: string;
  secondHalf: string;
  fullMatch: string;
}

export interface MatchRecord {
  id: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  score: { home: number; away: number };
  events: MatchEvent[];
  playerSummary: { [playerId: string]: PlayerStats };
  snapshot?: WatchModeState;
  notes?: MatchNotes;
}

const STORAGE_KEY = 'savedMatches';

function ensureSnapshot(record: MatchRecord): WatchModeState {
  if (record.snapshot) {
    return {
      ...record.snapshot,
      matchId: record.snapshot.matchId || record.id,
      events: normalizeMatchEvents(record.snapshot.events ?? record.events ?? []),
    };
  }

  const fallbackHomeTeam: Team = {
    id: `saved-home-${record.id}`,
    dbTeamId: `saved-home-${record.id}`,
    name: record.homeTeam || 'Home',
  };
  const fallbackAwayTeam: Team = {
    id: `saved-away-${record.id}`,
    dbTeamId: `saved-away-${record.id}`,
    name: record.awayTeam || 'Away',
  };

  return {
    matchId: record.id,
    homeTeam: fallbackHomeTeam,
    awayTeam: fallbackAwayTeam,
    homePlayers: [],
    awayPlayers: [],
    initialHomeLineup: {},
    initialAwayLineup: {},
    homeLineup: {},
    awayLineup: {},
    homeBench: [],
    awayBench: [],
    homeFormation: '4-4-2',
    awayFormation: '4-4-2',
    timerState: undefined,
    events: normalizeMatchEvents(record.events ?? []),
  };
}

type SupabaseMatchRow = {
  id: string;
  created_at?: string | null;
  home_team?: string | null;
  away_team?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  notes?: unknown;
  player_summary?: unknown;
  snapshot?: unknown;
};

type SupabaseEventRow = {
  id?: string | null;
  match_id: string;
  minute?: number | null;
  team?: string | null;
  player?: number | null;
  type?: string | null;
  sub_type?: string | null;
  comment?: string | null;
  created_at?: string | null;
};

function readSavedMatchesFromLocalStorage(): MatchRecord[] {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return [];
    const raw = JSON.parse(json) as MatchRecord[];
    return raw.map(record => ({
      ...record,
      events: normalizeMatchEvents(record.events ?? []),
    }));
  } catch (e) {
    console.error('Failed to load matches from localStorage', e);
    return [];
  }
}

function writeSavedMatchesToLocalStorage(matches: MatchRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
  } catch (e) {
    console.warn('Failed to write matches to localStorage', e);
  }
}

function asNotes(notes: unknown): MatchNotes | undefined {
  if (!notes || typeof notes !== 'object') return undefined;
  const n = notes as Record<string, unknown>;
  return {
    firstHalf: typeof n.firstHalf === 'string' ? n.firstHalf : '',
    secondHalf: typeof n.secondHalf === 'string' ? n.secondHalf : '',
    fullMatch: typeof n.fullMatch === 'string' ? n.fullMatch : '',
  };
}

function asPlayerSummary(playerSummary: unknown): { [playerId: string]: PlayerStats } {
  if (!playerSummary || typeof playerSummary !== 'object') return {};
  return playerSummary as { [playerId: string]: PlayerStats };
}

function asSnapshot(snapshot: unknown): WatchModeState | undefined {
  if (!snapshot || typeof snapshot !== 'object') return undefined;
  return snapshot as WatchModeState;
}

function toTeam(value: unknown): 'home' | 'away' {
  return value === 'away' ? 'away' : 'home';
}

function toEventTime(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function mapEventRowToMatchEvent(row: SupabaseEventRow): MatchEvent {
  const type = row.type ?? 'Stamp';
  const eventId = row.id && row.id !== '' ? row.id : crypto.randomUUID();
  const time = toEventTime(row.minute);
  const team = toTeam(row.team);

  if (type === 'team') {
    const stamp = (row.sub_type ?? 'buildUp') as TeamStampType;
    return {
      id: eventId,
      time,
      type: 'team',
      team,
      stamp,
      ...(row.comment ? { comment: row.comment } : {}),
    };
  }

  if (type === 'FORMATION_CHANGE') {
    return {
      id: eventId,
      time,
      type: 'FORMATION_CHANGE',
      team,
      fromFormation: '',
      toFormation: '',
      lineupSnapshot: {},
    };
  }

  if (type === 'Substitution') {
    return {
      id: eventId,
      time,
      type: 'Substitution',
      team,
      ...(row.comment ? { comment: row.comment } : {}),
    };
  }

  const playerType = type as EventType | 'Stamp' | 'Goal';
  return {
    id: eventId,
    time,
    team,
    playerNumber: typeof row.player === 'number' ? row.player : 0,
    type: playerType,
    ...(row.sub_type ? { stampType: row.sub_type } : {}),
    ...(row.comment ? { comment: row.comment } : {}),
  };
}

function mapMatchRowsToRecords(
  matchRows: SupabaseMatchRow[],
  eventRows: SupabaseEventRow[]
): MatchRecord[] {
  const eventsByMatchId = new Map<string, MatchEvent[]>();
  for (const row of eventRows) {
    const list = eventsByMatchId.get(row.match_id) ?? [];
    list.push(mapEventRowToMatchEvent(row));
    eventsByMatchId.set(row.match_id, list);
  }

  return matchRows.map(row => ({
    id: row.id,
    date: row.created_at ?? new Date().toISOString(),
    homeTeam: row.home_team ?? 'Home',
    awayTeam: row.away_team ?? 'Away',
    score: {
      home: row.home_score ?? 0,
      away: row.away_score ?? 0,
    },
    events: normalizeMatchEvents(eventsByMatchId.get(row.id) ?? []),
    playerSummary: asPlayerSummary(row.player_summary),
    snapshot: asSnapshot(row.snapshot),
    notes: asNotes(row.notes),
  }));
}

async function upsertMatchToSupabase(record: MatchRecord): Promise<void> {
  const snapshotToSave = record.snapshot ?? ensureSnapshot(record);
  const matchRow = {
    id: record.id,
    home_team: record.homeTeam,
    away_team: record.awayTeam,
    home_score: record.score.home,
    away_score: record.score.away,
    notes: record.notes ?? {},
    snapshot: snapshotToSave,
  };
  console.log(
    '[saveMatch] upsert match',
    record.id,
    'events:',
    record.events.length,
    'hasSnapshot:',
    !!snapshotToSave
  );
  console.log('[saveMatch] snapshot saved to football_matches', {
    matchId: snapshotToSave.matchId,
    source: record.snapshot ? 'record.snapshot' : 'fallback',
    homeFormation: snapshotToSave.homeFormation,
    awayFormation: snapshotToSave.awayFormation,
    homeBenchCount: snapshotToSave.homeBench?.length ?? 0,
    awayBenchCount: snapshotToSave.awayBench?.length ?? 0,
    hasTimerState: !!snapshotToSave.timerState,
    homeLineupSize: Object.keys(snapshotToSave.homeLineup ?? {}).length,
    awayLineupSize: Object.keys(snapshotToSave.awayLineup ?? {}).length,
  });
  console.log('matchRow', matchRow);
  const { error: matchError } = await supabase
    .from('football_matches')
    .upsert(matchRow, { onConflict: 'id' });

  if (matchError) throw matchError;

  const { error: deleteEventsError } = await supabase
    .from('football_events')
    .delete()
    .eq('match_id', record.id);
  if (deleteEventsError) throw deleteEventsError;

  if (record.events.length === 0) return;

  const eventRows = record.events.map(event => ({
    match_id: record.id,
    minute: event.time,
    team: event.team,
    player: 'playerNumber' in event ? event.playerNumber : null,
    type: event.type,
    sub_type: 'stampType' in event ? event.stampType ?? null : ('stamp' in event ? event.stamp : null),
    comment: 'comment' in event ? event.comment ?? null : null,
  }));

  const { error: eventsError } = await supabase
    .from('football_events')
    .insert(eventRows);

  if (eventsError) throw eventsError;
}

/**
 * Auto-save for Match Pad (single draft session).
 * Key: matchpad:autoSave:v1
 *
 * 動作確認ポイント:
 * - イベント追加・編集・削除、交代・フォーメーション・配置・チーム色・タイマー操作後に「Saved」が一瞬表示され、localStorage に保存されること
 * - タブを切り替えたり閉じる直前に保存が走ること（visibilitychange / pagehide）
 * - 「観戦ノート作成」クリック時に draft があれば復元確認モーダルが出ること（WatchMode マウント時には出さない）
 * - [復元する] でその試合が snapshot として開くこと / [新規作成] で draft をクリアして新規作成に進むこと
 */
export const AUTO_SAVE_KEY = 'matchpad:autoSave:v1';

/** Same shape as WatchModeState — serializable snapshot for restore. */
export type PersistedMatchState = WatchModeState;

/**
 * Saves Match Pad state to localStorage (auto-save).
 * Catches errors so app does not crash on quota/stringify failure.
 */
export function saveAuto(state: PersistedMatchState): void {
  try {
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Auto-save failed', e);
  }
}

/** Returns whether a draft (auto-saved watch state) exists. Use before offering restore. */
export function hasDraft(): boolean {
  try {
    const json = localStorage.getItem(AUTO_SAVE_KEY);
    if (!json) return false;
    const raw = JSON.parse(json) as PersistedMatchState;
    return !!(raw && raw.matchId && raw.events);
  } catch {
    return false;
  }
}

/**
 * Loads auto-saved state from localStorage if present.
 * Normalizes events for legacy compatibility.
 */
export function loadAuto(): PersistedMatchState | null {
  try {
    const json = localStorage.getItem(AUTO_SAVE_KEY);
    if (!json) return null;
    const raw = JSON.parse(json) as PersistedMatchState;
    if (!raw || !raw.matchId || !raw.events) return null;
    return {
      ...raw,
      events: normalizeMatchEvents(raw.events),
    };
  } catch (e) {
    console.warn('Auto-save load failed', e);
    return null;
  }
}

/** Clears auto-saved state (e.g. when user chooses "Discard and new"). */
export function clearAuto(): void {
  try {
    localStorage.removeItem(AUTO_SAVE_KEY);
  } catch (e) {
    console.warn('Clear auto-save failed', e);
  }
}

/** Active players on pitch = current lineup values. */
export function getActivePlayerIds(lineup: { [key: number]: string }): string[] {
  return Object.values(lineup).filter(Boolean);
}

/**
 * Compute current lineup from initial lineup and match events (replay substitution and formation change events in order).
 * Pure function: does not mutate inputs. Deleting a substitution event and recomputing restores the previous player.
 */
export function computeLineupFromEvents(
  initialLineup: { [key: number]: string },
  events: MatchEvent[],
  team: 'home' | 'away'
): { [key: number]: string } {
  const teamEvents = events
    .filter(ev => (isSubstitutionEvent(ev) && ev.team === team) || (isFormationChangeEvent(ev) && ev.team === team))
    .slice()
    .sort((a, b) => a.time - b.time);

  let lineup = { ...initialLineup };
  for (const ev of teamEvents) {
    if (isSubstitutionEvent(ev) && ev.playerInId != null && ev.playerOutId != null) {
      const posKey = Object.keys(lineup).find(k => lineup[Number(k)] === ev.playerOutId);
      if (posKey != null) {
        lineup = { ...lineup, [Number(posKey)]: ev.playerInId };
        // eslint-disable-next-line no-console
        console.log('[computeLineupFromEvents] applied sub: pos', posKey, 'out:', ev.playerOutId, 'in:', ev.playerInId, 'lineup:', lineup);
      } else {
        // eslint-disable-next-line no-console
        console.warn('[computeLineupFromEvents] outgoing player not found in lineup:', ev.playerOutId, 'lineup:', lineup);
      }
    } else if (isFormationChangeEvent(ev)) {
      lineup = { ...ev.lineupSnapshot };
    }
  }
  return lineup;
}

/**
 * Compute current formation from initial formation and formation change events.
 */
export function computeFormationFromEvents(
  initialFormation: string,
  events: MatchEvent[],
  team: 'home' | 'away'
): string {
  const formationChanges = events
    .filter((ev): ev is FormationChangeEvent => isFormationChangeEvent(ev) && ev.team === team)
    .slice()
    .sort((a, b) => a.time - b.time);
  if (formationChanges.length === 0) return initialFormation;
  return formationChanges[formationChanges.length - 1].toFormation;
}

/**
 * Players eligible to be selected as substitutes (to come on).
 * - Active players (on pitch) are never eligible.
 * - If bench is provided and non-empty: only those bench players not currently on pitch.
 * - If bench is absent or empty: all team players not currently on pitch.
 */
export function getEligibleSubstitutes(
  teamPlayers: Player[],
  lineup: { [key: number]: string },
  bench?: string[]
): Player[] {
  const activeIds = getActivePlayerIds(lineup);
  const notActive = (p: Player) => !activeIds.includes(p.id);

  if (bench && bench.length > 0) {
    const benchSet = new Set(bench);
    return teamPlayers.filter(p => benchSet.has(p.id) && notActive(p));
  }
  return teamPlayers.filter(notActive);
}

export async function listMatchesFromSupabase(): Promise<MatchRecord[]> {
  const { data: matchData, error: matchError } = await supabase
    .from('football_matches')
    .select('*')
    .order('created_at', { ascending: false });

  if (matchError) throw matchError;

  const matchRows = (matchData ?? []) as SupabaseMatchRow[];
  if (matchRows.length === 0) return [];

  const matchIds = matchRows.map(row => row.id);
  const { data: eventData, error: eventError } = await supabase
    .from('football_events')
    .select('*')
    .in('match_id', matchIds)
    .order('minute', { ascending: true });

  if (eventError) throw eventError;

  return mapMatchRowsToRecords(matchRows, (eventData ?? []) as SupabaseEventRow[]);
}

export async function getMatchByIdFromSupabase(id: string): Promise<MatchRecord | null> {
  const { data: matchData, error: matchError } = await supabase
    .from('football_matches')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (matchError) throw matchError;
  if (!matchData) return null;

  const { data: eventData, error: eventError } = await supabase
    .from('football_events')
    .select('*')
    .eq('match_id', id)
    .order('minute', { ascending: true });

  if (eventError) throw eventError;

  const records = mapMatchRowsToRecords(
    [matchData as SupabaseMatchRow],
    (eventData ?? []) as SupabaseEventRow[]
  );
  return records[0] ?? null;
}

export async function getSavedMatches(): Promise<MatchRecord[]> {
  try {
    const remote = await listMatchesFromSupabase();
    writeSavedMatchesToLocalStorage(remote);
    return remote;
  } catch (e) {
    console.warn('Falling back to localStorage for saved matches', e);
    return readSavedMatchesFromLocalStorage();
  }
}

export async function saveMatch(record: MatchRecord): Promise<void> {
  const recordWithSnapshot: MatchRecord = {
    ...record,
    snapshot: ensureSnapshot(record),
  };

  // Local storage is the source of immediate UX success.
  try {
    const existing = readSavedMatchesFromLocalStorage();
    const withoutSameId = existing.filter(m => m.id !== recordWithSnapshot.id);
    writeSavedMatchesToLocalStorage([...withoutSameId, recordWithSnapshot]);
  } catch (e) {
    console.error('Failed to save match to localStorage', e);
    throw e;
  }

  // Supabase sync runs in background and must never break save UX.
  void upsertMatchToSupabase(recordWithSnapshot).catch((e) => {
    console.warn('Supabase save failed (background sync)', e);
  });
}

export async function deleteMatch(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('football_matches')
      .delete()
      .eq('id', id);
    if (error) {
      console.warn('Supabase delete failed, deleting local cache only', error);
    }
  } catch (e) {
    console.warn('Supabase delete crashed, deleting local cache only', e);
  }

  try {
    const matches = readSavedMatchesFromLocalStorage();
    const updated = matches.filter(m => m.id !== id);
    writeSavedMatchesToLocalStorage(updated);
  } catch (e) {
    console.error('Failed to delete match', e);
    throw e;
  }
}

export async function getMatchById(id: string): Promise<MatchRecord | null> {
  try {
    const remote = await getMatchByIdFromSupabase(id);
    if (remote) {
      const local = readSavedMatchesFromLocalStorage();
      const merged = [remote, ...local.filter(m => m.id !== id)];
      writeSavedMatchesToLocalStorage(merged);
    }
    return remote;
  } catch (e) {
    console.warn('Falling back to localStorage for match detail', e);
    const local = readSavedMatchesFromLocalStorage();
    return local.find(m => m.id === id) ?? null;
  }
}

export function computePlayerStats(events: MatchEvent[]) {
  const stats: { [playerId: string]: { [type: string]: number } } = {};

  for (const ev of events) {
    if (!isPlayerEvent(ev) || !ev.playerId) continue;

    if (!stats[ev.playerId]) {
      stats[ev.playerId] = {};
    }

    const key = ev.stampType ?? ev.type;
    stats[ev.playerId][key] = (stats[ev.playerId][key] || 0) + 1;
  }

  return stats;
}
