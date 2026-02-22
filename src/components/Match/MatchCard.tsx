import React from 'react';
import { useNavigate } from 'react-router-dom';
import { type MatchRecord } from '../../utils/matchStorage';
import { computeTeamStampStats } from '../../utils/stampStats';
import styles from './MatchCard.module.css';

interface MatchCardProps {
  match: MatchRecord;
  onDelete: (id: string) => void;
}

export function MatchCard({ match, onDelete }: MatchCardProps) {
  const navigate = useNavigate();
  const stampStats = computeTeamStampStats(match.events ?? []);

  const handleCardClick = () => {
    if (match.snapshot) {
      navigate(`/match/${match.snapshot.matchId}/watch`, { state: { snapshot: match.snapshot, notes: match.notes } });
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(match.id);
  };

  return (
    <div
      className={`${styles.card} ${match.snapshot ? styles.clickable : ''}`}
      onClick={handleCardClick}
    >
      <div className={styles.header}>
        <span className={styles.date}>
          {new Date(match.date).toLocaleString()}
        </span>
        <div className={styles.scoreRow}>
          <span className={styles.score}>
            {match.score.home} - {match.score.away}
          </span>
          <button
            onClick={handleDeleteClick}
            className={styles.deleteBtn}
          >
            Delete
          </button>
        </div>
      </div>

      <div className={styles.matchTitle}>
        {match.homeTeam} vs {match.awayTeam}
      </div>

      <div className={styles.footer}>
        <span>{match.events.length} events recorded</span>
        {!match.snapshot && <span className={styles.noReplay}>(No Replay)</span>}
        <span className={styles.stampSummary}>
          Stamps: H Good {stampStats.home.good} Bad {stampStats.home.bad} / A Good {stampStats.away.good} Bad {stampStats.away.bad}
        </span>
      </div>
    </div>
  );
}
