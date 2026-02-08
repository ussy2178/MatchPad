import { Modal } from '../common/Modal';
import { PlayerForm } from '../PlayerForm/PlayerForm';
import { type Player } from '../../db/db';

interface AddPlayerModalProps {
  teamId: string;
  isOpen: boolean;
  onClose: () => void;
  onPlayerCreated?: (player: Player) => void;
}

export function AddPlayerModal({ teamId, isOpen, onClose, onPlayerCreated }: AddPlayerModalProps) {
  const handleSuccess = (player?: Player) => {
    // PlayerForm calls onSuccess when added.
    // We expect player to be returned now, but let's handle if it wasn't for safety (though I modified it).
    // Actually, I modified PlayerForm to pass player.
    if (player && onPlayerCreated) {
      onPlayerCreated(player);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Player"
    >
      <PlayerForm
        teamId={teamId}
        onSuccess={handleSuccess}
        onCancel={onClose}
      />
    </Modal>
  );
}
