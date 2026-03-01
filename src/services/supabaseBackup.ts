import { supabase } from '../lib/supabase';
import type { MatchEvent } from '../types/match';
import type { MatchRecord } from '../utils/matchStorage';
import type { WatchModeState } from '../utils/matchStorage';
import type { Team } from '../db/db';

function ensureSnapshot(match: MatchRecord): WatchModeState {
  if (match.snapshot) return match.snapshot;
  const fallbackHome: Team = {
    id: `saved-home-${match.id}`,
    dbTeamId: `saved-home-${match.id}`,
    name: match.homeTeam || 'Home',
  };
  const fallbackAway: Team = {
    id: `saved-away-${match.id}`,
    dbTeamId: `saved-away-${match.id}`,
    name: match.awayTeam || 'Away',
  };
  return {
    matchId: match.id,
    homeTeam: fallbackHome,
    awayTeam: fallbackAway,
    homePlayers: [],
    awayPlayers: [],
    initialHomeLineup: {},
    initialAwayLineup: {},
    homeLineup: {},
    awayLineup: {},
    homeBench: [],
    awayBench: [],
    homeFormation: '4-4-2',
    awayFormation: '4-4-2',
    timerState: undefined,
    events: match.events ?? [],
  };
}

export async function backupMatchToSupabase(match: MatchRecord) {
  if (!supabase || !match) {
    console.warn("Supabase disabled or invalid match");
    return;
  }

  try {
    console.log("Supabase backup triggered");
    const snapshotToSave = match.snapshot ?? ensureSnapshot(match);
    console.log('[supabaseBackup] snapshot saved to football_matches', {
      matchId: snapshotToSave.matchId,
      source: match.snapshot ? 'match.snapshot' : 'fallback',
      homeFormation: snapshotToSave.homeFormation,
      awayFormation: snapshotToSave.awayFormation,
      homeBenchCount: snapshotToSave.homeBench?.length ?? 0,
      awayBenchCount: snapshotToSave.awayBench?.length ?? 0,
      hasTimerState: !!snapshotToSave.timerState,
      homeLineupSize: Object.keys(snapshotToSave.homeLineup ?? {}).length,
      awayLineupSize: Object.keys(snapshotToSave.awayLineup ?? {}).length,
    });

    const { data: savedMatch, error } = await supabase
      .from("football_matches")
      .upsert({
        id: match.id, // User didn't include ID but we might want it? 
        // User snippet didn't include ID, just select().single(). 
        // Supabase usually autogenerates ID if not provided, or we can use match.id if we want consistency.
        // User snippet: 
        /*
          home_team: match.homeTeam,
          away_team: match.awayTeam,
          home_score: match.homeScore,
          away_score: match.awayScore,
          notes: match.notes ?? {},
        */
        // I'll follow user snippet but add `match.score?.home` support as I know my object structure.
        home_team: match.homeTeam,
        away_team: match.awayTeam,
        home_score: match.score.home,
        away_score: match.score.away,
        notes: match.notes ?? {},
        snapshot: snapshotToSave,
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error || !savedMatch) {
      console.warn("Supabase match backup failed", error);
      return;
    }

    if (!Array.isArray(match.events)) return;
    const { error: deleteEventsError } = await supabase
      .from("football_events")
      .delete()
      .eq('match_id', savedMatch.id);
    if (deleteEventsError) {
      console.warn("Supabase old events delete failed", deleteEventsError);
      return;
    }

    const events = match.events.map((e: MatchEvent) => ({
      match_id: savedMatch.id,
      minute: e.time,
      team: e.team,
      player: 'playerNumber' in e ? e.playerNumber : 0,
      type: e.type,
      sub_type: 'stampType' in e ? e.stampType ?? null : null,
      comment: 'comment' in e ? e.comment ?? null : null,
    }));

    if (events.length > 0) {
      const { error: eventError } = await supabase
        .from("football_events")
        .insert(events);

      if (eventError) {
        console.warn("Supabase event backup failed", eventError);
      }
    }
  } catch (err) {
    console.warn("Supabase backup crashed", err);
  }
}
