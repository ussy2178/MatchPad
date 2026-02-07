import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTeam } from '../../hooks/useTeams';
import { usePlayers } from '../../hooks/usePlayers';
import { FORMATIONS, type FormationName } from '../../constants/formations';
import { Pitch } from './Pitch';
import { Pitch } from './Pitch';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import styles from './Formation.module.css';

export function FormationEditor() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const team = useTeam(teamId || '');
  const players = usePlayers(teamId || '');

  const [currentFormation, setCurrentFormation] = useState<FormationName>('4-4-2');
  const [lineup, setLineup] = useState<{ [positionIndex: number]: string }>({}); // posIndex -> playerId
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Load existing match data? For now, we are creating new.

  if (!team) return <div>Loading...</div>;

  const formation = FORMATIONS[currentFormation];

  const formation = FORMATIONS[currentFormation];

  // const handleNodeClick = ... removed


  const handlePlayerSelect = (playerId: string) => {
    if (selectedSlot === null) return;

    // Check if player is already assigned elsewhere?
    // User requirement: "Prevent duplicate assignments"
    // If assigned elsewhere, maybe remove from old slot?
    // Let's Find old slot
    const oldSlot = Object.keys(lineup).find(key => lineup[parseInt(key)] === playerId);

    setLineup(prev => {
      const next = { ...prev };
      if (oldSlot) delete next[parseInt(oldSlot)]; // Remove from old
      next[selectedSlot] = playerId; // Assign to new
      return next;
    });

    setIsPickerOpen(false);
    setSelectedSlot(null);
  };

  const handleRemovePlayer = () => {
    if (selectedSlot === null) return;
    setLineup(prev => {
      const next = { ...prev };
      delete next[selectedSlot];
      return next;
    });
    setIsPickerOpen(false);
  };

  // const getAssignedPlayer = ... removed


  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <Button variant="ghost" onClick={() => navigate(-1)}>&larr;</Button>
        <h1 className={styles.title}>Starting Lineup</h1>
        <div style={{ width: 40 }} /> {/* Spacer */}
      </header>

      {/* Controls */}
      <div className={styles.controls}>
        <label>Formation:</label>
        <select
          value={currentFormation}
          onChange={(e) => {
            if (confirm('Changing formation will reset positions. Continue?')) {
              setCurrentFormation(e.target.value as FormationName);
              setLineup({}); // Reset lineup on formation change for simplicity? or try to map?
              // User didn't specify. Resetting is safest for MVP.
            }
          }}
          className={styles.select}
        >
          {Object.keys(FORMATIONS).map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* Pitch */}
      <div className={styles.editorArea}>
        <Pitch
          formation={formation}
          lineup={lineup}
          players={players}
        />
      </div>

      {/* Player Picker Modal */}
      <Modal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        title="Select Player"
      >
        <div className={styles.playerList}>
          {/* Option to clear slot */}
          {selectedSlot !== null && lineup[selectedSlot] && (
            <button className={styles.playerItem} onClick={handleRemovePlayer} style={{ color: 'red' }}>
              <span style={{ fontWeight: 'bold' }}>&times; Clear Slot</span>
            </button>
          )}

          {players.map(player => {
            const isAssigned = Object.values(lineup).includes(player.id);
            // If assigned to currently selected slot, it is "selected".
            // If assigned to other slot, it might be disabled or show "Moved from X".
            const isCurrent = selectedSlot !== null && lineup[selectedSlot] === player.id;

            return (
              <button
                key={player.id}
                className={`${styles.playerItem} ${isAssigned && !isCurrent ? styles.disabled : ''}`}
                onClick={() => handlePlayerSelect(player.id)}
                disabled={isAssigned && !isCurrent} // Prevent duplicate? Or allow swap? 
              // Plan said "Prevent duplicate". Disabling is easiest.
              >
                <span className={styles.jersey}>{player.jerseyNumber}</span>
                <span className={styles.name}>{player.name}</span>
                <span className={styles.pos}>{player.position}</span>
                {isAssigned && !isCurrent && <span className={styles.status}> (In Use)</span>}
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
