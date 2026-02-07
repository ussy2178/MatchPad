import { type Player } from '../../db/db';
import styles from './WatchMode.module.css';

interface BenchModalProps {
  isOpen: boolean;
  onClose: () => void;
  benchPlayers: Player[];
  outPlayerName?: string;
  onSelect: (inPlayerId: string) => void;
}

export function BenchModal({ isOpen, onClose, benchPlayers, outPlayerName, onSelect }: BenchModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Sub: {outPlayerName} OUT</h3>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div className={styles.benchList}>
          <h4>Select Replacement:</h4>
          {benchPlayers.length === 0 ? (
            <p className={styles.emptyBench}>No players on bench.</p>
          ) : (
            benchPlayers.map(p => (
              <div
                key={p.id}
                className={styles.benchRow}
                onClick={() => onSelect(p.id)}
              >
                <span className={styles.benchNumber}>{p.jerseyNumber}</span>
                <span className={styles.benchName}>{p.name}</span>
                <span className={styles.benchPos}>{p.position}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
