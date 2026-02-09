import { supabase } from '../lib/supabase';
import type { MatchEvent } from '../types/match';

export async function backupMatchToSupabase(match: any) {
  if (!supabase || !match) {
    console.warn("Supabase disabled or invalid match");
    return;
  }

  try {
    console.log("Supabase backup triggered");

    const { data: savedMatch, error } = await supabase
      .from("football_matches")
      .insert({
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
        home_score: match.score?.home ?? match.homeScore ?? 0,
        away_score: match.score?.away ?? match.awayScore ?? 0,
        notes: match.notes ?? {},
      })
      .select()
      .single();

    if (error || !savedMatch) {
      console.warn("Supabase match backup failed", error);
      return;
    }

    if (!Array.isArray(match.events)) return;

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
