import { useState, useEffect } from 'react';
import type { StampQuality } from '../../types/match';
import styles from './WatchMode.module.css';

type StampType = 'pass' | 'shot' | 'defense' | 'dribble' | 'cross' | 'movement' | 'positioning' | 'running' | 'save' | 'foul';

interface PlayerActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (type: string, subType: string | null, comment?: string, quality?: StampQuality) => Promise<void> | void;
  playerInfo: { team: 'home' | 'away'; number: number } | null;
  /** Actual team name for the title (e.g. "鹿島アントラーズ"). */
  teamName?: string;
  playerName?: string;
  /** When provided, shows "選手交代" in the header. Clicking it triggers substitution flow and closes this modal. */
  onSubstituteClick?: () => void;
}

const STAMP_DEFINITIONS: { type: StampType; label: string; category: 'attack' | 'defense' | 'other' }[] = [
  { type: 'pass', label: 'パス', category: 'attack' },
  { type: 'shot', label: 'シュート', category: 'attack' },
  { type: 'dribble', label: 'ドリブル', category: 'attack' },
  { type: 'cross', label: 'クロス', category: 'attack' },
  { type: 'defense', label: 'ディフェンス', category: 'defense' },
  { type: 'save', label: 'セーブ', category: 'defense' },
  { type: 'positioning', label: 'ポジショニング', category: 'other' },
  { type: 'running', label: 'ランニング', category: 'other' },
];

export function PlayerActionModal({ isOpen, onClose, onSave, playerInfo, teamName, playerName, onSubstituteClick }: PlayerActionModalProps) {
  const [selectedStamp, setSelectedStamp] = useState<StampType | null>(null);
  const [comment, setComment] = useState('');
  const [quality, setQuality] = useState<StampQuality>('good');

  useEffect(() => {
    if (isOpen) {
      setSelectedStamp(null);
      setComment('');
      setQuality('good');
    }
  }, [isOpen]);

  if (!isOpen || !playerInfo) return null;

  const handleSave = () => {
    if (selectedStamp) {
      onSave('Stamp', selectedStamp, comment, quality);
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTitleBlock}>
            <div className={styles.modalHeaderTeamName}>
              {teamName ?? (playerInfo.team === 'home' ? 'HOME' : 'AWAY')}
            </div>
            <div className={styles.modalHeaderPlayerLine}>
              #{playerInfo.number}{playerName ? ` ${playerName}` : ''}
            </div>
          </div>
          <div className={styles.modalHeaderActions}>
            {onSubstituteClick && (
              <button
                type="button"
                className={styles.headerSubstituteBtn}
                onClick={() => { onSubstituteClick(); onClose(); }}
              >
                選手交代
              </button>
            )}
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
          {STAMP_DEFINITIONS.map(def => (
            <button
              key={def.type}
              className={`${styles.stampBtn} ${selectedStamp === def.type ? styles.activeStamp : ''}`}
              onClick={() => setSelectedStamp(def.type)}
            >
              <span className={`${styles.stampDot} ${styles[def.category]}`}>●</span>
              {def.label}
            </button>
          ))}
        </div>

        <div className={styles.commentSection}>
          <textarea
            placeholder="Optional comment..."
            className={styles.commentInput}
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
          />
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={!selectedStamp}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
