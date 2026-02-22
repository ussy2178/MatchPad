import type { MatchEvent } from '../types/match';
import { isPlayerEvent, isTeamEvent } from '../types/match';

/**
 * Returns true if the event counts as a "stamp" for team stamp stats.
 * Stamps: player stamps (Pass, Shot, Dribble, etc.) and team stamps (buildUp, defense, break).
 * Excludes: Goal, Substitution, FormationChange.
 */
export function isStampEvent(ev: MatchEvent): boolean {
  if (isTeamEvent(ev)) return true;
  if (isPlayerEvent(ev) && ev.type !== 'Goal') return true;
  return false;
}

export interface TeamStampCounts {
  good: number;
  bad: number;
}

export interface TeamStampStats {
  home: TeamStampCounts;
  away: TeamStampCounts;
}

/**
 * Computes team-level stamp counts (Good / Bad) from match events.
 * Uses event.team (home/away); quality defaults to "good" when missing.
 */
export function computeTeamStampStats(events: MatchEvent[]): TeamStampStats {
  const home: TeamStampCounts = { good: 0, bad: 0 };
  const away: TeamStampCounts = { good: 0, bad: 0 };

  for (const ev of events) {
    if (!isStampEvent(ev)) continue;
    const team = ev.team === 'away' ? away : home;
    const isBad = 'quality' in ev && ev.quality === 'bad';
    if (isBad) team.bad += 1;
    else team.good += 1;
  }

  return { home, away };
}
