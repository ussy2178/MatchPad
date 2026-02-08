import type { EventType } from '../db/db';

export type { EventType };

/**
 * Shared MatchEvent type for UI and saved match records
 * (WatchMode local events, MatchRecord, WatchModeState).
 */
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
