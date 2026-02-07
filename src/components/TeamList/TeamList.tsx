import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeams } from '../../hooks/useTeams';
import { Button } from '../common/Button';
import styles from './TeamList.module.css';

function TeamLogo({ name, logoPath }: { name: string; logoPath?: string }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <div className={styles.logoPlaceholder}>
      {logoPath && status !== 'error' && (
        <img
          src={logoPath}
          alt={name}
          className={styles.logoImage}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          style={{ display: status === 'loaded' ? 'block' : 'none' }}
        />
      )}
      {/* Show placeholder if no logo, or if loading, or if error */}
      {(!logoPath || status !== 'loaded') && (
        <span className={styles.fallbackText}>{name.substring(0, 1)}</span>
      )}
    </div>
  );
}

export function TeamList() {
  const teams = useTeams();
  const navigate = useNavigate();

  if (!teams) return <div>Loading...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>MatchPad</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button onClick={() => navigate('/saved-matches')} style={{ backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' }}>
            Saved Matches
          </Button>
          <Button variant="primary" onClick={() => navigate('/match/new')}>
            観戦ノート作成
          </Button>
        </div>
      </header>
      <div className={styles.grid}>
        {teams.map((team) => (
          <div
            key={team.id}
            className={styles.card}
            onClick={() => navigate(`/team/${team.id}`)}
          >
            <TeamLogo name={team.name} logoPath={team.logoPath} />
            <span className={styles.teamName}>{team.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
