import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTeam } from '../hooks/useTeams';
import { getSavedMatches, deleteMatch, type MatchRecord } from '../utils/matchStorage';
import { PlayerList } from '../components/PlayerList/PlayerList';
import { MatchCard } from '../components/Match/MatchCard';
import { TeamSettingsModal } from '../components/TeamSettingsModal';
import { db } from '../db/db';
import styles from './TeamDetailPage.module.css';

export function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();

  const team = useTeam(teamId || '');
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    const allMatches = getSavedMatches();
    const teamMatches = allMatches
      .filter(m => m.snapshot?.homeTeam.id === teamId || m.snapshot?.awayTeam.id === teamId || m.homeTeam === team?.name || m.awayTeam === team?.name)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setMatches(teamMatches);
  }, [teamId, team?.name]);

  if (!teamId) return <div>Invalid Team ID</div>;
  if (!team) return <div>Loading...</div>;

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this match?')) return;
    try {
      await deleteMatch(id);
      setMatches(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      alert('Failed to delete match');
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.teamBrand}>
            {team.logoPath ? (
              <img src={team.logoPath} alt={team.name} className={styles.teamLogo} />
            ) : (
              <div className={styles.logoPlaceholder}>{team.name[0]}</div>
            )}
            <h1 className={styles.teamName}>{team.name}</h1>
          </div>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => setSettingsOpen(true)}
          >
            Settings
          </button>
        </div>
      </header>

      <TeamSettingsModal
        isOpen={settingsOpen}
        team={team}
        onSave={async (updates) => {
          if (teamId) await db.teams.update(teamId, updates);
          setSettingsOpen(false);
        }}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Main Content Grid */}
      <div className={styles.grid}>

        {/* Left Column: Matches */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Match History</h2>
          </div>

          {matches.length === 0 ? (
            <div className={styles.emptyState}>No matches recorded.</div>
          ) : (
            <div className={styles.matchList}>
              {matches.map(match => (
                <MatchCard key={match.id} match={match} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Players (Reuse Check) */}
        <div className={styles.section}>
          {/* We reuse PlayerList, but pass 'embedded' to strip its header */}
          <PlayerList embedded />
        </div>

      </div>
    </div>
  );
}
