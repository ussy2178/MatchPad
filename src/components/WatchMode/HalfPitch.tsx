// import styles from '../Formation/Formation.module.css'; // Unused
// We likely need specific styles for horizontal lines.
// I'll define local styles for the pitch lines in WatchMode.module.css or inline for now.
// Better to use WatchMode.module.css class mapping.
import watchStyles from './WatchMode.module.css';
import { PlayerNode } from '../Formation/PlayerNode';
import { useMatchContext } from '../../contexts/MatchContext';
import type { Player } from '../../db/db';

interface HalfPitchProps {
  side: 'home' | 'away'; // 'home' = Left Half, 'away' = Right Half
  formation: { positions: readonly { id: number; x: number; y: number; label: string }[] };
  lineup: { [key: number]: string };
  players: Player[];
  onNodeClick: (playerId: string) => void;
  /** When an empty slot (+) is clicked. Omit to disable assignment from empty slots. */
  onEmptySlotClick?: (slotId: number) => void;
  showNames?: boolean;
  /** Team primary color for player marker border. */
  primaryColor?: string;
}

export function HalfPitch({
  side,
  formation,
  lineup,
  players,
  onNodeClick,
  onEmptySlotClick,
  showNames = false,
  primaryColor,
}: HalfPitchProps) {
  const matchContext = useMatchContext();
  const teamColor =
    matchContext != null
      ? side === 'home'
        ? matchContext.homeTeamColor
        : matchContext.awayTeamColor
      : primaryColor;

  // Debug: ensure component always mounts (no early return on missing formation/lineup)
  // if (!formation) return null;
  // if (!lineup) return null;
  // eslint-disable-next-line no-console
  console.log('HalfPitch render', side, !!formation, !!lineup, formation?.positions?.length);

  // Mapping Logic:
  // Standard Formation (Vertical): x (0-100 width), y (0-100 depth).
  // Target: Horizontal Half Pitch (aspect 3/4).
  // x axis of container = Depth of field.
  // y axis of container = Width of field.

  // Home (Left Side):
  // GK is near Goal (Left Edge, x=0).
  // Center Line is at Right Edge (x=100).
  // Vertical Y (0-100) -> Horizontal X (0-100).
  // Vertical X (0-100) -> Horizontal Y (0-100).

  // Away (Right Side):
  // GK is near Goal (Right Edge, x=100).
  // Center Line is at Left Edge (x=0).
  // Vertical Y (0-100) -> Horizontal X (100-0) (Mirrored depth).
  // Vertical X (0-100) -> Horizontal Y (0-100).

  const mapPosition = (pos: { id: number; x: number; y: number; label: string }) => {
    // Use exact coordinates without artificial scaling
    const scaledX = pos.x;
    const scaledY = pos.y;

    // Assumption: pos.y is 0 (GK) to 100 (Forward) on a vertical half??
    // OR pos.y is 0-100 on full pitch?
    // If Full Pitch (0-100), typical Defending Half is 0-50.
    // We want to map 0-50 (or 0-60) to 0-100 of this container.
    // Data is Vertical (GK at y=90).
    // View is Horizontal (Home GK at Left x=0, Away GK at Right x=100).
    // We must swap axes to map Vertical Data to Horizontal View.

    let newX, newY;

    if (side === 'home') {
      // Home: Rotate -90 degrees
      // y=90 (Bottom) -> x=10 (Left)
      // x=20 (Left) -> y=20 (Top)
      newX = 100 - scaledY;
      newY = scaledX;
    } else {
      // Away: Rotate +90 degrees (or Mirror Home)
      // y=90 (Bottom) -> x=90 (Right)
      // x=20 (Left) -> y=80 (Bottom) to keep correct flank
      newX = scaledY;
      newY = 100 - scaledX;
    }

    // Clamp to ensure visibility (5-95%)
    newX = Math.max(5, Math.min(95, newX));
    newY = Math.max(5, Math.min(95, newY));

    return { ...pos, x: newX, y: newY };
  };

  return (
    <div className={`${watchStyles.halfPitch} ${watchStyles[side]}`}>
      {/* Players */}
      {formation.positions.map(pos => {
        const mapped = mapPosition(pos);
        const playerId = lineup[pos.id];
        const player = players.find(p => p.id === playerId);

        return (
          <PlayerNode
            key={pos.id}
            position={mapped}
            player={player}
            onClick={() => {
              if (playerId) {
                onNodeClick(playerId);
              } else if (onEmptySlotClick) {
                onEmptySlotClick(pos.id);
              }
            }}
            isSelected={false}
            showName={showNames}
            mirror={false}
            className={watchStyles.watchNode}
            teamColor={teamColor}
          />
        );
      })}
    </div>
  );
}
