import Dexie, { type EntityTable } from 'dexie';
import { J1_TEAMS, type Team } from './seeds';
export type { Team };

export interface Player {
  id: string; // UUID
  teamId: string;
  name: string;
  jerseyNumber: number;
  position: 'GK' | 'DF' | 'MF' | 'FW';
  externalUrl?: string;
}

export interface TimerState {
  phase: '1H' | '2H' | 'HT' | 'FT';
  running: boolean;
  startedAtMs: number | null; // Timestamp when started/resumed
  elapsedMs: number;          // Accumulated time before current start
}

export interface Match {
  id: string; // UUID
  date: Date;
  kickoffTime?: string;

  homeTeamId: string;
  awayTeamId: string;

  homeFormation: string;
  awayFormation: string;

  homeLineup: { [positionIndex: number]: string };
  awayLineup: { [positionIndex: number]: string };

  timerState?: TimerState;
}

export type EventType = 'Pass' | 'Shot' | 'Defense' | 'Dribble' | 'Cross' | 'Movement' | 'Substitution';

export interface MatchEvent {
  id: string; // UUID
  matchId: string;
  playerId: string;
  type: EventType;
  time: number; // Ms from start of match (accumulated)
  comment?: string;
  createdAt: Date;
}

// Database declaration
export const db = new Dexie('J1ManagerDB') as Dexie & {
  teams: EntityTable<Team, 'id'>;
  players: EntityTable<Player, 'id'>;
  matches: EntityTable<Match, 'id'>;
  events: EntityTable<MatchEvent, 'id'>;
};

// Schema definition
db.version(1).stores({
  teams: 'id, name',
  players: 'id, teamId, jerseyNumber',
});

// Version 2: Re-seed teams with Japanese names
db.version(2).stores({}).upgrade(async (trans) => {
  // Clear existing teams (which are English)
  await trans.table('teams').clear();
  // Re-populate with new Japanese data
  await trans.table('teams').bulkAdd(J1_TEAMS);
});

// Version 3: Add logoPath (Re-seed)
db.version(3).stores({}).upgrade(async (trans) => {
  // Clear to ensure we get the fresh objects with logoPath
  await trans.table('teams').clear();
  await trans.table('teams').bulkAdd(J1_TEAMS);
});

// Version 4: Update J1 Team List (New Season/IDs)
db.version(4).stores({}).upgrade(async (trans) => {
  await trans.table('teams').clear();
  await trans.table('teams').bulkAdd(J1_TEAMS);
});

// Version 5: Link Logos (public/logos)
db.version(5).stores({}).upgrade(async (trans) => {
  await trans.table('teams').clear();
  await trans.table('teams').bulkAdd(J1_TEAMS);
});

// Version 6: Update to SVG logos
db.version(6).stores({}).upgrade(async (trans) => {
  await trans.table('teams').clear();
  await trans.table('teams').bulkAdd(J1_TEAMS);
});

// Version 7: Add matches table
db.version(7).stores({
  matches: 'id, teamId, date',
});

// Version 8: Refine Match Schema (Home/Away)
db.version(8).stores({
  matches: 'id, date, homeTeamId, awayTeamId',
}).upgrade(async (trans) => {
  // Clear old match data as schema changed significantly
  if (trans.table('matches')) {
    await trans.table('matches').clear();
  }
});

// Version 9: Revert to PNG logos
db.version(9).stores({}).upgrade(async (trans) => {
  await trans.table('teams').clear();
  await trans.table('teams').bulkAdd(J1_TEAMS);
});

// Version 10: Add events table
db.version(10).stores({
  events: 'id, matchId, playerId, type, time',
});

// Version 11: Add compound index for players (teamId+jerseyNumber)
db.version(11).stores({
  players: 'id, teamId, jerseyNumber, [teamId+jerseyNumber]'
});

// Seeding hook - primarily for fresh installs
db.on('populate', async () => {
  await db.teams.bulkAdd(J1_TEAMS);
  console.log('Database seeded with J1 teams');
});
