import { useState, useEffect } from 'react';
import type { Team } from '../db/db';
import { DEFAULT_TEAM_PRIMARY, DEFAULT_TEAM_SECONDARY } from '../db/seeds';
import styles from './WatchMode/WatchMode.module.css';

export interface TeamSettingsModalProps {
  isOpen: boolean;
  team: Team | null;
  onSave: (updates: { primaryColor?: string; secondaryColor?: string }) => void;
  onClose: () => void;
}

export function TeamSettingsModal({ isOpen, team, onSave, onClose }: TeamSettingsModalProps) {
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_TEAM_PRIMARY);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_TEAM_SECONDARY);

  useEffect(() => {
    if (isOpen && team) {
      setPrimaryColor(team.primaryColor ?? DEFAULT_TEAM_PRIMARY);
      setSecondaryColor(team.secondaryColor ?? DEFAULT_TEAM_SECONDARY);
    }
  }, [isOpen, team]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ primaryColor, secondaryColor });
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 style={{ margin: 0 }}>Team settings</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className={styles.substitutionBody} style={{ padding: 16 }}>
          {team && (
            <p style={{ marginBottom: 16, fontWeight: 600 }}>{team.name}</p>
          )}
          <div className={styles.substitutionSection}>
            <label className={styles.substitutionSectionTitle}>Primary color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="color"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                style={{ width: 48, height: 36, padding: 2, cursor: 'pointer', border: '1px solid #e5e7eb', borderRadius: 6 }}
              />
              <input
                type="text"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                style={{ flex: 1, padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, fontFamily: 'monospace' }}
              />
            </div>
          </div>
          <div className={styles.substitutionSection}>
            <label className={styles.substitutionSectionTitle}>Secondary color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="color"
                value={secondaryColor}
                onChange={e => setSecondaryColor(e.target.value)}
                style={{ width: 48, height: 36, padding: 2, cursor: 'pointer', border: '1px solid #e5e7eb', borderRadius: 6 }}
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={e => setSecondaryColor(e.target.value)}
                style={{ flex: 1, padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, fontFamily: 'monospace' }}
              />
            </div>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.saveBtn} onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
