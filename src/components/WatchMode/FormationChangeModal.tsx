import { useState, useEffect, useMemo, useRef } from 'react';
import { FORMATIONS, type FormationName } from '../../constants/formations';
import { FormationPreview } from '../Formation/FormationPreview';
import { reassignLineupToFormation } from '../../utils/formationUtils';
import type { Player } from '../../db/db';
import styles from './WatchMode.module.css';
import formationStyles from '../Formation/Formation.module.css';

export interface FormationChangeModalProps {
  isOpen: boolean;
  team: 'home' | 'away';
  teamName: string;
  currentFormation: string;
  /** Pass edited lineup when user confirmed after rearranging; otherwise parent may derive from reassignment. */
  onConfirm: (toFormation: FormationName, editedLineup?: { [key: number]: string }) => void;
  onClose: () => void;
  /** Optional: lineup and players for formation preview. */
  lineup?: { [key: number]: string };
  players?: Player[];
}

export function FormationChangeModal({
  isOpen,
  team,
  teamName,
  currentFormation,
  onConfirm,
  onClose,
  lineup = {},
  players = [],
}: FormationChangeModalProps) {
  const [selectedFormation, setSelectedFormation] = useState<FormationName>(
    (currentFormation as FormationName) || '4-4-2'
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedFormation((currentFormation as FormationName) || '4-4-2');
    }
  }, [isOpen, currentFormation]);

  const previewLineup = useMemo(() => {
    const currentFmt = (currentFormation as FormationName) || '4-4-2';
    const selectedFmt = selectedFormation;
    if (selectedFmt === currentFmt) return lineup;
    return reassignLineupToFormation(lineup, currentFmt, selectedFmt);
  }, [lineup, currentFormation, selectedFormation]);

  const [editableLineup, setEditableLineup] = useState<{ [key: number]: string }>({});
  const [originalLineup, setOriginalLineup] = useState<{ [key: number]: string }>({});
  const openedRef = useRef(false);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [hoveredSlotId, setHoveredSlotId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEditableLineup(previewLineup);
      if (!openedRef.current) {
        openedRef.current = true;
        setOriginalLineup({ ...previewLineup });
      }
      setSelectedSlotId(null);
      setHoveredSlotId(null);
    } else {
      openedRef.current = false;
    }
  }, [isOpen, previewLineup]);

  const lineupChanged = useMemo(() => {
    const allSlotIds = new Set([...Object.keys(originalLineup).map(Number), ...Object.keys(editableLineup).map(Number)]);
    for (const slotId of allSlotIds) {
      if (editableLineup[slotId] !== originalLineup[slotId]) return true;
    }
    return false;
  }, [editableLineup, originalLineup]);

  const handleSlotClick = (slotId: number) => {
    if (selectedSlotId === null) {
      setSelectedSlotId(slotId);
      return;
    }
    if (selectedSlotId === slotId) {
      setSelectedSlotId(null);
      return;
    }
    setEditableLineup((prev) => {
      const a = prev[selectedSlotId];
      const b = prev[slotId];
      const next = { ...prev };
      if (a !== undefined) next[slotId] = a;
      else delete next[slotId];
      if (b !== undefined) next[selectedSlotId] = b;
      else delete next[selectedSlotId];
      return next;
    });
    setSelectedSlotId(null);
  };

  const formationChanged = selectedFormation !== currentFormation;
  const canConfirm = formationChanged || lineupChanged;

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm(selectedFormation, editableLineup);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modalContent} ${styles.modalContentFormation}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTitleBlock}>
            <div className={styles.modalHeaderTeamName}>
              {team === 'home' ? 'HOME' : 'AWAY'}
            </div>
            <div className={styles.modalHeaderPlayerLine}>
              {teamName} — フォーメーション変更
            </div>
          </div>
          <div className={styles.modalHeaderActions}>
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
              &times;
            </button>
          </div>
        </div>

        <div className={styles.formationModalBody}>
          <div className={styles.substitutionSection}>
            <label className={styles.substitutionSectionTitle}>新しいフォーメーション</label>
            <select
              className={formationStyles.formationSelect}
              value={selectedFormation}
              onChange={e => setSelectedFormation(e.target.value as FormationName)}
              style={{ width: '100%' }}
            >
              {Object.keys(FORMATIONS).map(k => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          {players.length > 0 && (
            <div className={styles.formationPreviewRow}>
              <div className={styles.formationPreviewSection}>
                <label className={styles.substitutionSectionTitle}>プレビュー（クリックで入れ替え）</label>
                <FormationPreview
                  formationName={selectedFormation}
                  lineup={editableLineup}
                  players={players}
                  selectedSlotId={selectedSlotId}
                  onSlotClick={handleSlotClick}
                  onSlotHover={setHoveredSlotId}
                  className={styles.formationPreviewLarge}
                />
              </div>
              <div className={styles.swapPreviewPanel}>
                <div className={styles.swapPreviewRow}>
                  <span className={styles.swapPreviewLabel}>Selected:</span>
                  <span className={styles.swapPreviewValue}>
                    {selectedSlotId != null
                      ? (() => {
                          const pid = editableLineup[selectedSlotId];
                          const p = players.find(x => x.id === pid);
                          return p ? `${p.jerseyNumber} ${p.name}` : '—';
                        })()
                      : '—'}
                  </span>
                </div>
                <div className={styles.swapPreviewRow}>
                  <span className={styles.swapPreviewLabel}>Target:</span>
                  <span className={styles.swapPreviewValue}>
                    {hoveredSlotId != null && hoveredSlotId !== selectedSlotId
                      ? (() => {
                          const pid = editableLineup[hoveredSlotId];
                          const p = players.find(x => x.id === pid);
                          return p ? `${p.jerseyNumber} ${p.name}` : '—';
                        })()
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
