import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSavedMatches, deleteMatch, type MatchRecord } from '../utils/matchStorage';

export default function SavedMatchesPage() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this match?')) return;
    try {
      await deleteMatch(id);
      setMatches(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      alert('Failed to delete match');
    }
  };

  useEffect(() => {
    const loadMatches = async () => {
      try {
        // Step 4: Load saved matches
        const saved = await getSavedMatches();
        setMatches(saved);
      } catch (e) {
        console.error("Failed to load matches", e);
        setError("Failed to load saved matches.");
      }
    };
    loadMatches();
  }, []);

  if (error) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <h2 style={{ color: 'red' }}>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')} style={{ marginTop: '16px', padding: '8px 16px' }}>
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Saved Matches</h1>
        {/* Step 6: Back Button */}
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '8px 16px',
            background: 'none',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ← Back
        </button>
      </header>

      {/* Step 4: List Display */}
      {matches.length === 0 ? (
        <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>No saved matches yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {matches.map((match) => (
            <div
              key={match.id}
              onClick={() => {
                if (match.snapshot) {
                  navigate(`/match/${match.snapshot.matchId}/watch`, { state: { snapshot: match.snapshot, notes: match.notes } });
                }
              }}
              style={{
                background: 'white',
                padding: '16px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                border: '1px solid #e5e7eb',
                cursor: match.snapshot ? 'pointer' : 'default',
                transition: 'transform 0.1s',
              }}
              onMouseEnter={(e) => match.snapshot && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => match.snapshot && (e.currentTarget.style.transform = 'none')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#666' }}>
                  {new Date(match.date).toLocaleString()}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontWeight: 'bold' }}>
                    {match.score.home} - {match.score.away}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, match.id)}
                    style={{
                      background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px',
                      padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer',
                      zIndex: 10
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                {match.homeTeam} vs {match.awayTeam}
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#666' }}>
                {match.events.length} events recorded
                {!match.snapshot && <span style={{ marginLeft: '8px', color: '#999' }}>(No Replay)</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
