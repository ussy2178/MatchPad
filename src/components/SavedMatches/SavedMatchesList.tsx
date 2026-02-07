import { Link } from 'react-router-dom';
import { getSavedMatches, type MatchRecord } from '../../utils/matchStorage';
import { useEffect, useState } from 'react';
import styles from './SavedMatchesList.module.css'; // Assume we create this or use inline

export function SavedMatchesList() {
  const [matches, setMatches] = useState<MatchRecord[]>([]);

  useEffect(() => {
    setMatches(getSavedMatches());
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Saved Matches</h2>
        <Link to="/" style={{ textDecoration: 'none', color: '#666' }}>← Home</Link>
      </header>

      {matches.length === 0 ? (
        <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>No saved matches found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {matches.map(match => (
            <div key={match.id} style={{
              background: 'white',
              padding: '16px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              border: '1px solid #e5e7eb',
              textDecoration: 'none',
              color: 'inherit',
              display: 'block'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: '#666' }}>{new Date(match.date).toLocaleString()}</span>
                <span style={{ fontWeight: 'bold' }}>{match.score.home} - {match.score.away}</span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                {match.homeTeam} vs {match.awayTeam}
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#666' }}>
                {match.events.length} events recorded
              </div>
              {/* Future: Link to detail page if implemented */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
