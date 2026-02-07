import { type MatchNotes } from '../../utils/matchStorage';
import styles from './WatchMode.module.css';

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: MatchNotes;
  onChange: (notes: MatchNotes) => void;
}

export function NotesModal({ isOpen, onClose, notes, onChange }: NotesModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} style={{ width: '90%', maxWidth: '500px', padding: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>Match Notes</h3>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>First Half</label>
          <textarea
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '60px' }}
            value={notes.firstHalf}
            onChange={e => onChange({ ...notes, firstHalf: e.target.value })}
            placeholder="First half notes..."
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Second Half</label>
          <textarea
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '60px' }}
            value={notes.secondHalf}
            onChange={e => onChange({ ...notes, secondHalf: e.target.value })}
            placeholder="Second half notes..."
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Full Match / Summary</label>
          <textarea
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '80px' }}
            value={notes.fullMatch}
            onChange={e => onChange({ ...notes, fullMatch: e.target.value })}
            placeholder="Full match notes..."
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
