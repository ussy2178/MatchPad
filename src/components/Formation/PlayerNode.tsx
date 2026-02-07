import styles from './Formation.module.css';
import type { Player } from '../../db/db';

interface PlayerNodeProps {
  position: { id: number; x: number; y: number; label: string };
  player?: Player;
  onClick: () => void;
  isSelected?: boolean;
  showName?: boolean;
  mirror?: boolean;
  className?: string;
}

export function PlayerNode({ position, player, onClick, isSelected, showName = true, mirror, className }: PlayerNodeProps) {
  // If parent is mirrored (scaleX(-1)), we need to mirror text back (scaleX(-1))
  const textStyle = mirror ? { transform: 'scaleX(-1)' } : {};

  return (
    <div
      className={`${styles.playerNode} ${isSelected ? styles.selected : ''} ${className || ''}`}
      style={{ top: `${position.y}%`, left: `${position.x}%` }}
      onClick={(e) => {
        e.stopPropagation();
        console.log("PlayerNode clicked");
        onClick?.();
      }}
    >
      <div className={`${styles.nodeCircle} ${player ? styles.filled : styles.empty}`}>
        {player ? (
          <span className={styles.jerseyNumber} style={textStyle}>{player.jerseyNumber}</span>
        ) : (
          <span className={styles.plusIcon} style={textStyle}>+</span>
        )}
      </div>
      {showName && (
        <div className={styles.nodeLabel} style={textStyle}>{player?.name || position.label}</div>
      )}
    </div>
  );
}
