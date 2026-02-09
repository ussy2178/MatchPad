import type { Player } from '../../db/db';
import styles from './WatchMode.module.css';

export interface PlayerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Title, e.g. "Assign player to position" */
  title: string;
  /** Bench players only (not on pitch). */
  benchPlayers: Player[];
  onSelect: (playerId: string) => void;
  /** When provided, shows "+ Add new player" and calls this on click. */
  onAddPlayerClick?: () => void;
}

export function PlayerSelectionModal({
  isOpen,
  onClose,
  title,
  benchPlayers,
  onSelect,
  onAddPlayerClick,
}: PlayerSelectionModalProps) {
  if (!isOpen) return null;

  const handleSelect = (playerId: string) => {
    onSelect(playerId);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modalContent} ${styles.modalContentSubstitution}`}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '360px' }}
      >
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className={styles.substitutionBody}>
          <div className={`${styles.substitutionSection} ${styles.substitutionSectionScrollable}`}>
            {benchPlayers.length === 0 ? (
              <p className={styles.emptyBench}>No bench players available.</p>
            ) : (
              <div className={styles.benchListScroll}>
                <div className={styles.benchList}>
                  {benchPlayers
                    .slice()
                    .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
                    .map(p => (
                      <div
                        key={p.id}
                        className={styles.benchRow}
                        onClick={() => handleSelect(p.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelect(p.id);
                          }
                        }}
                      >
                        <span className={styles.benchNumber}>{p.jerseyNumber}</span>
                        <span className={styles.benchName}>{p.name}</span>
                        {p.position && <span className={styles.benchPos}>{p.position}</span>}
                      </div>
                    ))}
                </div>
              </div>
            )}
            {onAddPlayerClick && (
              <button
                type="button"
                className={styles.addPlayerInSubBtn}
                onClick={onAddPlayerClick}
              >
                + Add new player
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
