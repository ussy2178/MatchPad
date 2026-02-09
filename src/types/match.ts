import type { EventType } from '../db/db';

export type { EventType };

/** Team-level stamp type. */
export type TeamStampType =
  | 'buildUp'
  | 'defense'
  | 'break';

/** Quality of a stamp (good/bad). Default: "good". */
export type StampQuality = 'good' | 'bad';

/** Team-level event (not player-specific). */
export interface TeamEvent {
  type: 'team';
  team: 'home' | 'away';
  stamp: TeamStampType;
  timestamp: number;
  /** Quality of the stamp. Default: "good". */
  quality?: StampQuality;
}

/** Player stamp or goal event (single player). */
export interface PlayerEvent {
  id: string;
  time: number;
  team: 'home' | 'away';
  playerNumber: number;
  playerId?: string;
  type: EventType | 'Stamp' | 'Goal';
  stampType?: string;
  /** Quality of the stamp. Default: "good". Only applies to Stamp events. */
  quality?: StampQuality;
  comment?: string;
}

/**
 * Formation change event.
 * Records tactical formation change with lineup snapshot.
 */
export interface FormationChangeEvent {
  id: string;
  time: number;
  type: 'FORMATION_CHANGE';
  team: 'home' | 'away';
  fromFormation: string;
  toFormation: string;
  lineupSnapshot: { [posIndex: number]: string };
}

/**
 * Dedicated substitution event (not a stamp).
 * type: "Substitution", team (home/away), playerInId, playerOutId, time (timestamp ms from match start).
 * playerInId/playerOutId optional for legacy saved events.
 */
export interface SubstitutionEvent {
  id: string;
  /** Timestamp: ms from match start */
  time: number;
  team: 'home' | 'away';
  type: 'Substitution';
  playerInId?: string;
  playerOutId?: string;
  comment?: string;
}

/**
 * Shared MatchEvent type for UI and saved match records.
 * Union so rendering can support both player events and substitutions.
 */
export type MatchEvent = PlayerEvent | SubstitutionEvent | TeamEvent | FormationChangeEvent;

export function isSubstitutionEvent(ev: MatchEvent): ev is SubstitutionEvent {
  return ev.type === 'Substitution';
}

export function isFormationChangeEvent(ev: MatchEvent): ev is FormationChangeEvent {
  return ev.type === 'FORMATION_CHANGE';
}
