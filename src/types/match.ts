import type { EventType } from '../db/db';

export type { EventType };

/** Base fields present on every match event (for sorting, keys, delete). */
export interface BaseEvent {
  id: string;
  /** Ms from match start. */
  time: number;
}

/** Team-level stamp type. */
export type TeamStampType =
  | 'buildUp'
  | 'counter'
  | 'break'
  | 'defense';

/** Quality of a stamp (good/bad). Default: "good". */
export type StampQuality = 'good' | 'bad';

/** Team-level event (not player-specific). Uses BaseEvent id/time like other events. */
export interface TeamEvent extends BaseEvent {
  type: 'team';
  team: 'home' | 'away';
  stamp: TeamStampType;
  /** Quality of the stamp. Default: "good". */
  quality?: StampQuality;
  /** Optional comment (same as player stamps). */
  comment?: string;
}

/** Payload for creating a team event (modal); id and time are set when adding to the list. */
export type TeamEventPayload = Omit<TeamEvent, 'id' | 'time'>;

/** Player stamp or goal event (single player). */
export interface PlayerEvent extends BaseEvent {
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
export interface FormationChangeEvent extends BaseEvent {
  type: 'FORMATION_CHANGE';
  team: 'home' | 'away';
  fromFormation: string;
  toFormation: string;
  lineupSnapshot: { [posIndex: number]: string };
}

/**
 * Dedicated substitution event (not a stamp).
 * type: "Substitution", team (home/away), playerInId, playerOutId, time (ms from match start).
 */
export interface SubstitutionEvent extends BaseEvent {
  team: 'home' | 'away';
  type: 'Substitution';
  playerInId?: string;
  playerOutId?: string;
  comment?: string;
}

/**
 * Shared MatchEvent type for UI and saved match records.
 * All variants have id and time (BaseEvent).
 */
export type MatchEvent = PlayerEvent | SubstitutionEvent | TeamEvent | FormationChangeEvent;

export function isSubstitutionEvent(ev: MatchEvent): ev is SubstitutionEvent {
  return ev.type === 'Substitution';
}

export function isFormationChangeEvent(ev: MatchEvent): ev is FormationChangeEvent {
  return ev.type === 'FORMATION_CHANGE';
}

export function isTeamEvent(ev: MatchEvent): ev is TeamEvent {
  return ev.type === 'team';
}

export function isPlayerEvent(ev: MatchEvent): ev is PlayerEvent {
  return ev.type !== 'Substitution' && ev.type !== 'FORMATION_CHANGE' && ev.type !== 'team';
}
