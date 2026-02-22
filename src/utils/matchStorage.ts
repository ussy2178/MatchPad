import { backupMatchToSupabase } from '../services/supabaseBackup';
import { type Team, type Player, type TimerState } from '../db/db';
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

export function getSavedMatches(): MatchRecord[] {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.error('Failed to load matches', e);
    return [];
  }
}

export function saveMatch(record: MatchRecord): void {
  try {
    const existing = getSavedMatches();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, record]));

    // Trigger background backup
    backupMatchToSupabase(record);
  } catch (e) {
    console.error('Failed to save match', e);
    // Even if local save fails, we probably shouldn't backup? 
    // Or maybe we should? The try-catch block means local save failed. 
    // So backup won't run. Correct.
    throw e;
  }
}

export function deleteMatch(id: string): void {
  try {
    const matches = getSavedMatches();
    const updated = matches.filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete match', e);
    throw e;
  }
}

export function getMatchById(id: string): MatchRecord | null {
  const matches = getSavedMatches();
  return matches.find(m => m.id === id) || null;
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
