import { useState, useEffect } from 'react';
import styles from './WatchMode.module.css';

type StampType = 'pass' | 'shot' | 'defense' | 'dribble' | 'cross' | 'movement' | 'positioning' | 'running' | 'save' | 'foul';

interface PlayerActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (type: string, subType: string | null, comment?: string) => Promise<void> | void;
  playerInfo: { team: 'home' | 'away'; number: number } | null;
  playerName?: string;
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

export function PlayerActionModal({ isOpen, onClose, onSave, playerInfo, playerName }: PlayerActionModalProps) {
  const [selectedStamp, setSelectedStamp] = useState<StampType | null>(null);
  const [comment, setComment] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedStamp(null);
      setComment('');
    }
  }, [isOpen]);

  if (!isOpen || !playerInfo) return null;

  const handleSave = () => {
    if (selectedStamp) {
      // Use 'Stamp' as primary type, and the selectedStamp as subtype
      onSave('Stamp', selectedStamp, comment);
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h3>
              {playerInfo.team === 'home' ? 'HOME' : 'AWAY'} #{playerInfo.number}
            </h3>
            {playerName && <div style={{ fontSize: '0.9rem', color: '#666' }}>{playerName}</div>}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
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
