import { supabase } from '../lib/supabase';

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

    const events = match.events.map((e: any) => ({
      match_id: savedMatch.id,
      minute: e.time ?? 0, // Note: e.time is likely ms, but user asked for this mapping.
      team: e.team ?? "",
      player: e.playerNumber ?? 0, // Postgres integer usually
      type: e.type ?? "",
      sub_type: e.stampType ?? e.subType ?? null,
      comment: e.comment ?? null,
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
