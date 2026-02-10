import { PRESET_MATCH_COLORS } from '../Match/MatchCreationWizard';
import styles from './WatchMode.module.css';

interface TeamColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamSide: 'home' | 'away';
  teamName: string;
  currentColor: string | undefined;
  onSelect: (hex: string) => void;
}

export function TeamColorModal({
  isOpen,
  onClose,
  teamSide,
  teamName,
  currentColor,
  onSelect,
}: TeamColorModalProps) {
  if (!isOpen) return null;

  const handleSelect = (hex: string) => {
    onSelect(hex);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={e => e.stopPropagation()}
        style={{ padding: '20px', maxWidth: '320px' }}
      >
        <div className={styles.modalHeader}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
            {teamSide === 'home' ? 'Home' : 'Away'} team color
          </h3>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <p style={{ margin: '8px 0 16px', fontSize: '0.9rem', color: 'var(--color-text-sub)' }}>
          {teamName}
        </p>
        <div className={styles.teamColorSwatches} role="listbox" aria-label="Team color">
          {PRESET_MATCH_COLORS.map(({ hex, label }) => (
            <button
              key={hex}
              type="button"
              role="option"
              aria-selected={currentColor === hex}
              className={hex.toLowerCase() === '#ffffff' ? `${styles.teamColorSwatch} ${styles.teamColorSwatchWhite}` : styles.teamColorSwatch}
              style={{ backgroundColor: hex }}
              title={label}
              onClick={() => handleSelect(hex)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
