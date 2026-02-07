import { backupMatchToSupabase } from '../services/supabaseBackup';
import { type EventType, type Team, type Player, type TimerState } from '../db/db';

export interface MatchEvent {
  id: string;
  time: number;
  team: 'home' | 'away';
  playerNumber: number;
  playerId?: string;
  type: EventType | 'Stamp' | 'Goal';
  stampType?: string;
  comment?: string;
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
  homeLineup: { [key: number]: string };
  awayLineup: { [key: number]: string };
  homeFormation: string;
  awayFormation: string;
  timerState?: TimerState;
  events: MatchEvent[];
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
    if (!ev.playerId) continue;

    if (!stats[ev.playerId]) {
      stats[ev.playerId] = {};
    }

    // Key: use stampType if exists, else type. 
    const key = ev.stampType || ev.type;
    stats[ev.playerId][key] = (stats[ev.playerId][key] || 0) + 1;
  }

  return stats;
}
