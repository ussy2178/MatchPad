import { Pitch } from './Pitch';
import type { Player } from '../../db/db';
import type { FormationName } from '../../constants/formations';
import { FORMATIONS } from '../../constants/formations';
import styles from './Formation.module.css';

export interface FormationPreviewProps {
  /** Formation template name (e.g. '4-4-2'). */
  formationName: FormationName;
  /** Current on-field lineup: position id -> player id. */
  lineup: { [key: number]: string };
  /** All team players (used to resolve lineup ids). */
  players: Player[];
  /** Click-to-swap: when provided, clicking a slot selects it; second click swaps or cancels. */
  selectedSlotId?: number | null;
  onSlotClick?: (slotId: number) => void;
  /** Hover: when provided, reports slot id for swap preview (Target). */
  onSlotHover?: (slotId: number | null) => void;
  /** Optional className for the wrapper (e.g. larger size in modal). */
  className?: string;
}

/**
 * Preview of formation with 11 on-field players.
 * When onSlotClick is provided, supports click-to-swap (select then click another to swap).
 */
export function FormationPreview({
  formationName,
  lineup,
  players,
  selectedSlotId = null,
  onSlotClick,
  onSlotHover,
  className,
}: FormationPreviewProps) {
  const formation = FORMATIONS[formationName] || FORMATIONS['4-4-2'];
  const editable = !!onSlotClick;

  return (
    <div className={`${styles.formationPreview} ${className ?? ''}`.trim()}>
      <Pitch
        formation={formation}
        lineup={lineup}
        players={players}
        readOnly={!editable}
        showName={true}
        onNodeClick={onSlotClick}
        selectedNodeIndex={selectedSlotId}
        onSlotHover={editable ? onSlotHover : undefined}
      />
    </div>
  );
}
