import { useState, useEffect } from 'react';
import type { Player } from '../../db/db';
import { sortPlayersForDisplay } from '../../utils/playerSort';
import styles from './WatchMode.module.css';

export interface SubstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Player going OUT (current player on pitch). */
  outPlayer: { id: string; name: string; jerseyNumber: number } | null;
  /** Players eligible to come IN (bench if registered, else all team players except on-field). */
  eligibleInPlayers: Player[];
  onSelect: (inPlayerId: string) => void;
  /** When provided, shows "+ Add new player" and opens existing player creation flow on click. */
  onAddPlayerClick?: () => void;
  /** When provided, shows "Change Formation (optional)" and opens formation modal. */
  onOpenFormationChange?: () => void;
  /** When set, shows that formation will change on confirm (e.g. "Formation: 4-3-3"). */
  pendingFormationChange?: { toFormation: string } | null;
}

export function SubstitutionModal({
  isOpen,
  onClose,
  outPlayer,
  eligibleInPlayers,
  onSelect,
  onAddPlayerClick,
  onOpenFormationChange,
  pendingFormationChange,
}: SubstitutionModalProps) {
  const [pendingInPlayerId, setPendingInPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) setPendingInPlayerId(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const pendingInPlayer = pendingInPlayerId
    ? eligibleInPlayers.find(p => p.id === pendingInPlayerId)
    : null;

  const handleConfirm = () => {
    if (pendingInPlayerId) {
      onSelect(pendingInPlayerId);
      setPendingInPlayerId(null);
    }
  };

  const handleCancelPending = () => {
    setPendingInPlayerId(null);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modalContent} ${styles.modalContentSubstitution}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>交代 (Substitution)</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.substitutionBody}>
          <div className={styles.substitutionSection}>
            <h4 className={styles.substitutionSectionTitle}>Player going out</h4>
            <div className={styles.substitutionOut}>
              {outPlayer ? (
                <span className={styles.substitutionPlayer}>
                  #{outPlayer.jerseyNumber} {outPlayer.name}
                </span>
              ) : (
                <span className={styles.substitutionUnknown}>—</span>
              )}
            </div>
          </div>

          <div className={`${styles.substitutionSection} ${styles.substitutionSectionScrollable}`}>
            <h4 className={styles.substitutionSectionTitle}>Player coming in</h4>
            {eligibleInPlayers.length === 0 ? (
              <p className={styles.emptyBench}>No players available.</p>
            ) : (
              <div className={styles.benchListScroll}>
                <div className={styles.benchList}>
                  {sortPlayersForDisplay(eligibleInPlayers).map(p => (
                    <div
                      key={p.id}
                      className={`${styles.benchRow} ${p.id === pendingInPlayerId ? styles.benchRowSelected : ''}`}
                      onClick={() => setPendingInPlayerId(p.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setPendingInPlayerId(p.id);
                        }
                      }}
                    >
                      <span className={styles.benchNumber}>{p.jerseyNumber}</span>
                      <span className={styles.benchName}>{p.name}</span>
                      <span className={styles.benchPos}>{p.position}</span>
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

          {onOpenFormationChange && (
            <div className={styles.substitutionSection}>
              <button
                type="button"
                className={styles.addPlayerInSubBtn}
                onClick={onOpenFormationChange}
              >
                Change Formation (optional)
              </button>
              {pendingFormationChange && (
                <p className={styles.substitutionConfirmText} style={{ marginTop: 8, marginBottom: 0 }}>
                  Formation will change to {pendingFormationChange.toFormation}
                </p>
              )}
            </div>
          )}

          {pendingInPlayer && outPlayer && (
            <div className={styles.substitutionConfirm}>
              <p className={styles.substitutionConfirmText}>
                #{outPlayer.jerseyNumber} {outPlayer.name} → #{pendingInPlayer.jerseyNumber} {pendingInPlayer.name}
              </p>
              <div className={styles.substitutionConfirmActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={handleCancelPending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={handleConfirm}
                >
                  Confirm Substitution
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
