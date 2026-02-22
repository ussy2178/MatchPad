import type { Player } from '../db/db';

/** Minimal shape needed for display sorting (allows GoalModal etc. to use without full db Player). */
export type PlayerLike = Pick<Player, 'id'> & { position?: string; jerseyNumber?: number };

/** Position rank for display order: GK → DF → MF → FW → unknown */
const POSITION_RANK: Record<string, number> = {
  GK: 0,
  DF: 1,
  MF: 2,
  FW: 3,
};

const UNKNOWN_RANK = 9;
const MISSING_JERSEY = 999;

/**
 * Infers position group from a position string (handles exact or detailed positions).
 * Returns 'GK' | 'DF' | 'MF' | 'FW' | '' for unknown.
 */
function positionRank(pos: string | undefined): number {
  if (pos == null || String(pos).trim() === '') return UNKNOWN_RANK;
  const s = String(pos).trim().toUpperCase();
  if (s.startsWith('GK')) return POSITION_RANK.GK;
  if (s.startsWith('D') || s.includes('DF') || s.includes('CB') || s.includes('LB') || s.includes('RB') || s.includes('WB')) return POSITION_RANK.DF;
  if (s.startsWith('M') || s.includes('MF') || s.includes('DM') || s.includes('CM') || s.includes('AM')) return POSITION_RANK.MF;
  if (s.startsWith('F') || s.includes('FW') || s.includes('ST') || s.includes('CF')) return POSITION_RANK.FW;
  return UNKNOWN_RANK;
}

function jerseyNum(n: number | undefined): number {
  if (n == null || Number.isNaN(Number(n))) return MISSING_JERSEY;
  return Number(n);
}

/**
 * Sorts players for UI display: position order (GK → DF → MF → FW → unknown),
 * then by jersey number ascending within each group.
 * Does not mutate the input; returns a new array.
 */
export function sortPlayersForDisplay<T extends PlayerLike>(players: T[]): T[] {
  return [...players].sort((a, b) => {
    const rankA = positionRank(a.position);
    const rankB = positionRank(b.position);
    if (rankA !== rankB) return rankA - rankB;
    return jerseyNum(a.jerseyNumber) - jerseyNum(b.jerseyNumber);
  });
}
