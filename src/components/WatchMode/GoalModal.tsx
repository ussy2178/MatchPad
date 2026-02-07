import { useState, useEffect } from 'react';
import styles from './WatchMode.module.css';

interface Player {
  id: string;
  name: string;
  jerseyNumber: number;
}

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { scorerId: string | null; assistId: string | null; isOwnGoal: boolean }) => void;
  teamName: string;
  players: Player[]; // Players of the SCORING team
}

export function GoalModal({ isOpen, onClose, onSave, teamName, players }: GoalModalProps) {
  const [scorerId, setScorerId] = useState<string>('');
  const [assistId, setAssistId] = useState<string>('');
  const [isOwnGoal, setIsOwnGoal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setScorerId('');
      setAssistId('');
      setIsOwnGoal(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      scorerId: isOwnGoal ? null : (scorerId || null),
      assistId: isOwnGoal ? null : (assistId || null),
      isOwnGoal
    });
    onClose();
  };

  // Filter players for display
  const sortedPlayers = [...players].sort((a, b) => a.jerseyNumber - b.jerseyNumber);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ padding: '20px' }}>
        <div className={styles.modalHeader}>
          <h3>{teamName} 得点</h3>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          {/* Own Goal Checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            <input
              type="checkbox"
              checked={isOwnGoal}
              onChange={e => setIsOwnGoal(e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            オウンゴール
          </label>

          {/* Scorer Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.9rem', color: '#666' }}>得点者</label>
            <select
              className={styles.commentInput} // reuse input style
              value={scorerId}
              onChange={e => setScorerId(e.target.value)}
              disabled={isOwnGoal}
              style={{ padding: '8px' }}
            >
              <option value="">選択してください</option>
              {sortedPlayers.map(p => (
                <option key={p.id} value={p.id}>
                  #{p.jerseyNumber} {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assist Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.9rem', color: '#666' }}>アシスト者 (任意)</label>
            <select
              className={styles.commentInput}
              value={assistId}
              onChange={e => setAssistId(e.target.value)}
              disabled={isOwnGoal}
              style={{ padding: '8px' }}
            >
              <option value="">なし</option>
              {sortedPlayers.map(p => (
                <option key={p.id} value={p.id} disabled={p.id === scorerId}>
                  #{p.jerseyNumber} {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.modalFooter} style={{ marginTop: '24px' }}>
          <button className={styles.cancelBtn} onClick={onClose}>キャンセル</button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={!isOwnGoal && !scorerId} // Must select scorer unless OG
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
