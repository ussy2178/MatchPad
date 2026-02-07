import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSavedMatches, deleteMatch, type MatchRecord } from '../utils/matchStorage';
import { MatchCard } from '../components/Match/MatchCard';

export default function SavedMatchesPage() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
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

      {matches.length === 0 ? (
        <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>No saved matches yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
