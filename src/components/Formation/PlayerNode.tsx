import styles from './Formation.module.css';
import { getPlayerColors, lightenColor } from '../../utils/colorUtils';
import type { Player } from '../../db/db';

interface PlayerNodeProps {
  position: { id: number; x: number; y: number; label: string };
  player?: Player;
  onClick: () => void;
  isSelected?: boolean;
  showName?: boolean;
  mirror?: boolean;
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  /** Team color for player marker border (preferred). */
  teamColor?: string;
  /** Team primary color (e.g. player marker border). Deprecated in favor of teamColor. */
  primaryColor?: string;
}

export function PlayerNode({ position, player, onClick, isSelected, showName = true, mirror, className, onMouseEnter, onMouseLeave, teamColor, primaryColor }: PlayerNodeProps) {
  const textStyle = mirror ? { transform: 'scaleX(-1)' } : {};
  const effectiveTeamColor = teamColor ?? primaryColor;
  const wrapperStyle = {
    top: `${position.y}%`,
    left: `${position.x}%`,
    color: '#111',
  };
  const { borderColor, backgroundColor } = effectiveTeamColor
    ? getPlayerColors(effectiveTeamColor)
    : { borderColor: '#e5e7eb', backgroundColor: '#f2f2f2' };
  const circleStyle = {
    border: `2px solid ${borderColor}`,
    backgroundColor,
  };
  const labelStyle = {
    ...textStyle,
    color: '#111',
    backgroundColor: effectiveTeamColor ? lightenColor(effectiveTeamColor, 95) : '#fafafa',
    boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
    border: 'none',
  };

  return (
    <div
      className={`${styles.playerNode} ${isSelected ? styles.selected : ''} ${className || ''}`}
      style={wrapperStyle}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={`${styles.nodeCircle} ${player ? styles.filled : styles.empty}`} style={circleStyle}>
        {player ? (
          <span className={styles.jerseyNumber} style={{ ...textStyle, color: '#111' }}>{player.jerseyNumber}</span>
        ) : (
          <span className={styles.plusIcon} style={{ ...textStyle, color: '#111' }}>+</span>
        )}
      </div>
      {showName && (
        <div className={styles.nodeLabel} style={labelStyle}>{player?.name || position.label}</div>
      )}
    </div>
  );
}
