import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

export function useTeams() {
  const teams = useLiveQuery(() => db.teams.orderBy('name').toArray());
  return teams ?? [];
}

export function useTeam(teamId: string) {
  const team = useLiveQuery(() => db.teams.get(teamId), [teamId]);
  return team;
}
