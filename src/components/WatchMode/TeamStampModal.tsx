import { useState } from 'react';
import type { TeamEventPayload, TeamStampType, StampQuality } from '../../types/match';
import styles from './WatchMode.module.css';

export interface TeamStampModalProps {
  team: 'home' | 'away';
  onSubmit: (event: TeamEventPayload) => void;
  onClose: () => void;
}

const TEAM_STAMP_BUTTONS: { stamp: TeamStampType; label: string }[] = [
  { stamp: 'break', label: '崩し' },
  { stamp: 'buildUp', label: 'ビルドアップ' },
  { stamp: 'defense', label: 'ディフェンス' },
];

export function TeamStampModal({ team, onSubmit, onClose }: TeamStampModalProps) {
  const [quality, setQuality] = useState<StampQuality>('good');

  const handleClick = (stamp: TeamStampType) => {
    const event: TeamEventPayload = {
      type: 'team',
      team,
      stamp,
      quality,
    };
    onSubmit(event);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
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
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">&times;</button>
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
      </div>
    </div>
  );
}
