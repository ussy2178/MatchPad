import { FORMATIONS, type FormationName } from '../constants/formations';

/**
 * Reassign current on-field players to a new formation.
 * Preserves relative order: maps players sequentially into new formation slots.
 * Option A logic: no player identity change, only positions.
 */
export function reassignLineupToFormation(
  currentLineup: { [key: number]: string },
  fromFormationName: string,
  toFormationName: string
): { [key: number]: string } {
  const fromFormation = FORMATIONS[fromFormationName as FormationName] || FORMATIONS['4-4-2'];
  const toFormation = FORMATIONS[toFormationName as FormationName] || FORMATIONS['4-4-2'];

  // Get players in order as they appear in current formation
  const playersInOrder = fromFormation.positions
    .map((pos) => currentLineup[pos.id])
    .filter((id): id is string => !!id);

  // Map sequentially into new formation slots
  const newLineup: { [key: number]: string } = {};
  toFormation.positions.forEach((pos, i) => {
    if (playersInOrder[i]) {
      newLineup[pos.id] = playersInOrder[i];
    }
  });

  return newLineup;
}
