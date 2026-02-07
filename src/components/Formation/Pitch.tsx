import styles from './Formation.module.css';
import { PlayerNode } from './PlayerNode';
import type { Player } from '../../db/db';

interface PitchProps {
  formation: { positions: readonly { id: number; x: number; y: number; label: string }[] };
  lineup: { [key: number]: string };
  players: Player[];
  onNodeClick?: (index: number) => void;
  selectedNodeIndex?: number | null;
  readOnly?: boolean;
  showName?: boolean;
  mirror?: boolean;
}

export function Pitch({ formation, lineup, players, onNodeClick, selectedNodeIndex, readOnly, showName = true, mirror }: PitchProps) {
  return (
    <div className={styles.pitchContainer}>
      <div className={styles.pitch}>
        {/* Pitch Markings */}
        <div className={styles.pitchLines}>
          <div className={styles.centerCircle} />
          <div className={styles.halfwayLine} />
          <div className={styles.penaltyAreaTop} />
          <div className={styles.penaltyAreaBottom} />
          <div className={styles.goalAreaTop} />
          <div className={styles.goalAreaBottom} />
        </div>

        {/* Players Layer */}
        <div className={styles.pitchContent}>
          {formation.positions.map((pos) => {
            const playerId = lineup[pos.id];
            const player = players.find((p) => p.id === playerId);
            const isSelected = selectedNodeIndex === pos.id;

            return (
              <PlayerNode
                key={pos.id}
                position={pos}
                player={player}
                onClick={() => !readOnly && onNodeClick && onNodeClick(pos.id)}
                isSelected={isSelected}
                showName={showName}
                mirror={mirror}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
