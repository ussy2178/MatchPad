import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { PlayerStats } from '../utils/matchStorage';

interface AggregatedStats {
  id: string; // Player ID (matches DB id)
  name: string;
  totalEvents: number;
  goals: number;
}

export function StatsPage() {
  const [stats, setStats] = useState<AggregatedStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch all players and all goals/events
      // 1. Fetch Players
      const { data: players, error: playersError } = await supabase.from('players').select('*');
      if (playersError) throw playersError;

      // 2. Fetch Aggregates from match_events
      // We rely on match_summary for efficiency.

      const { data: matches, error: matchError } = await supabase.from('matches').select('player_summary');
      if (matchError) throw matchError;

      const aggregator: { [id: string]: AggregatedStats } = {};

      // Initialize from players list
      players?.forEach(p => {
        aggregator[p.id] = { id: p.id, name: p.name, totalEvents: 0, goals: 0 };
      });

      // Aggregate from match summaries
      matches?.forEach(m => {
        const summary = m.player_summary as { [id: string]: PlayerStats };
        if (!summary) return;

        Object.entries(summary).forEach(([pid, stat]) => {
          if (!aggregator[pid]) {
            // If player not in DB yet? shouldn't happen if upserted correctly
            aggregator[pid] = { id: pid, name: stat.name, totalEvents: 0, goals: 0 };
          }

          aggregator[pid].goals += stat.counts.goal || 0;
          // Total events = sum of all counts
          const total = Object.values(stat.counts).reduce((a, b) => a + b, 0);
          aggregator[pid].totalEvents += total;
        });
      });

      setStats(Object.values(aggregator).sort((a, b) => b.goals - a.goals || b.totalEvents - a.totalEvents));

    } catch (e) {
      console.error('Error loading stats', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Player Stats</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>Aggregated from all saved matches</p>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
              <th style={{ padding: '10px' }}>Player</th>
              <th style={{ padding: '10px' }}>Goals</th>
              <th style={{ padding: '10px' }}>Total Actions</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>{s.name}</td>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>{s.goals}</td>
                <td style={{ padding: '10px' }}>{s.totalEvents}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
