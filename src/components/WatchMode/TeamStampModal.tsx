import { useState } from 'react';
import type { TeamEventPayload, TeamStampType, StampQuality } from '../../types/match';
import styles from './WatchMode.module.css';

export interface TeamStampModalProps {
  team: 'home' | 'away';
  onSubmit: (event: TeamEventPayload) => void;
  onClose: () => void;
}

const TEAM_STAMP_BUTTONS: { stamp: TeamStampType; label: string }[] = [
  { stamp: 'buildUp', label: 'ビルドアップ' },
  { stamp: 'counter', label: 'カウンター' },
  { stamp: 'break', label: '崩し' },
  { stamp: 'defense', label: 'ディフェンス' },
];

export function TeamStampModal({ team, onSubmit, onClose }: TeamStampModalProps) {
  const [quality, setQuality] = useState<StampQuality>('good');
  const [comment, setComment] = useState('');

  const handleClose = () => {
    setComment('');
    onClose();
  };

  const handleClick = (stamp: TeamStampType) => {
    const event: TeamEventPayload = {
      type: 'team',
      team,
      stamp,
      quality,
      ...(comment.trim() ? { comment: comment.trim() } : {}),
    };
    onSubmit(event);
    setComment('');
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTitleBlock}>
            <div className={styles.modalHeaderTeamName}>
              {team === 'home' ? 'HOME' : 'AWAY'}
            </div>
            <div className={styles.modalHeaderPlayerLine}>
              チームプレー
            </div>
          </div>
          <div className={styles.modalHeaderActions}>
            <button type="button" className={styles.closeBtn} onClick={handleClose} aria-label="Close">&times;</button>
          </div>
        </div>

        <div className={styles.qualityRow}>
          <div className={styles.qualityToggle}>
            <button
              type="button"
              className={`${styles.stampBtn} ${styles.qualityBtnGood} ${quality === 'good' ? styles.activeStamp : ''}`}
              onClick={() => setQuality('good')}
            >
              Good
            </button>
            <button
              type="button"
              className={`${styles.stampBtn} ${styles.qualityBtnBad} ${quality === 'bad' ? styles.activeStamp : ''}`}
              onClick={() => setQuality('bad')}
            >
              Bad
            </button>
          </div>
        </div>

        <div className={styles.stampGrid}>
          {TEAM_STAMP_BUTTONS.map(({ stamp, label }) => (
            <button
              key={stamp}
              className={styles.stampBtn}
              onClick={() => handleClick(stamp)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={styles.commentSection}>
          <label className={styles.commentLabel} htmlFor="team-stamp-comment">
            Comment (optional)
          </label>
          <textarea
            id="team-stamp-comment"
            placeholder="Add a note..."
            className={styles.commentInput}
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}
