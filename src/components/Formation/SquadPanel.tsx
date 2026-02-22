import { useMemo, useState, useEffect } from 'react';
import type { Player } from '../../db/db';
import { normalizePosition } from '../../utils/idUtils';
import { sortPlayersForDisplay } from '../../utils/playerSort';
import styles from './Formation.module.css';

interface SquadPanelProps {
  players: Player[];
  onSelectPlayer: (player: Player) => void;
  selectedPosIndex: number | null; // If null, maybe just viewing?
  activeCategory?: 'GK' | 'DF' | 'MF' | 'FW';
  onAddPlayerClick?: () => void;
}

export function SquadPanel({ players, onSelectPlayer, selectedPosIndex, activeCategory, onAddPlayerClick }: SquadPanelProps) {

  // Track collapsed state for each group
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({
    GK: true, DF: true, MF: true, FW: true
  });

  // Auto-expand active category when it changes
  useEffect(() => {
    if (activeCategory) {
      setExpandedGroups({
        GK: activeCategory === 'GK',
        DF: activeCategory === 'DF',
        MF: activeCategory === 'MF',
        FW: activeCategory === 'FW',
      });
    } else {
      // If no selection, maybe expand all?
      setExpandedGroups({ GK: true, DF: true, MF: true, FW: true });
    }
  }, [activeCategory]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // Group players by position (order: GK → DF → MF → FW); within each group use display order (position + jersey).
  const groupedPlayers = useMemo(() => {
    const sorted = sortPlayersForDisplay(players);
    return {
      GK: sorted.filter(p => normalizePosition(p.position) === 'GK'),
      DF: sorted.filter(p => normalizePosition(p.position) === 'DF'),
      MF: sorted.filter(p => normalizePosition(p.position) === 'MF'),
      FW: sorted.filter(p => normalizePosition(p.position) === 'FW'),
    };
  }, [players]);

  return (
    <div className={styles.squadPanel}>
      <div className={styles.panelHeader}>
        <h3>Suggestion</h3>
        {selectedPosIndex !== null && <span className={styles.badge}>Select Player</span>}
        {onAddPlayerClick && (
          <button
            onClick={onAddPlayerClick}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#007bff',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.9rem'
            }}
          >
            + Add Player
          </button>
        )}
      </div>

      <div className={styles.suggestionListScroll}>
        {Object.entries(groupedPlayers).map(([pos, list]) => (
          (list.length > 0) && (
            <div key={pos} className={styles.positionGroup}>
              <div
                className={styles.positionHeader}
                onClick={() => toggleGroup(pos)}
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
              >
                <span>{pos} ({list.length})</span>
                <span>{expandedGroups[pos] ? '−' : '+'}</span>
              </div>

              {expandedGroups[pos] && list.map(player => (
                <div
                  key={player.id}
                  className={styles.playerItem}
                  onClick={() => onSelectPlayer(player)}
                >
                  <div className={styles.playerNumber}>{player.jerseyNumber}</div>
                  <div className={styles.playerName}>{player.name}</div>
                </div>
              ))}
            </div>
          )
        ))}
        {players.length === 0 && <p className={styles.emptyMsg}>No players available.</p>}
      </div>
    </div>
  );
}
