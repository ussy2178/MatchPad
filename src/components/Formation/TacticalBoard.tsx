import { useState } from 'react';
import { FORMATIONS, type FormationName } from '../../constants/formations';
import { Pitch } from './Pitch';
import { SquadPanel } from './SquadPanel';
import type { Player } from '../../db/db';
import styles from './Formation.module.css';

interface TacticalBoardProps {
  formationName: FormationName;
  players: Player[];
  lineup: { [posIndex: number]: string }; // playerId map
  onLineupChange: (newLineup: { [posIndex: number]: string }) => void;
  teamName: string;
  onFormationChange?: (fmt: string) => void;
  logoUrl?: string; // Optional logo
}

export function TacticalBoard({
  formationName,
  players,
  lineup,
  onLineupChange,
  teamName,
  onFormationChange,
  logoUrl,
  // side - unused for now
}: TacticalBoardProps) {

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const formation = FORMATIONS[formationName] || FORMATIONS['4-4-2'];

  const handleNodeClick = (index: number) => {
    setSelectedSlot(index);
  };

  const handlePlayerSelect = (player: Player) => {
    if (selectedSlot === null) return;

    // Assign player to slot
    const newLineup = { ...lineup, [selectedSlot]: player.id };
    onLineupChange(newLineup);

    // Auto-advance or close selection? Let's keep it open for now or simple close
    setSelectedSlot(null);
  };



  // Determine the label/role of the selected slot
  const selectedPosLabel = selectedSlot !== null
    ? formation.positions.find(p => p.id === selectedSlot)?.label
    : null;

  // Map label to broad category (GK, DF, MF, FW) for filtering
  const getCategory = (label?: string) => {
    if (!label) return null;
    if (label === 'GK') return 'GK';
    if (['CB', 'LB', 'RB', 'WB', 'DF'].some(r => label.includes(r))) return 'DF';
    if (['DMF', 'CMF', 'RMF', 'LMF', 'OMF', 'MF'].some(r => label.includes(r))) return 'MF';
    if (['CF', 'ST', 'RWG', 'LWG', 'FW'].some(r => label.includes(r))) return 'FW';
    return null;
  };

  const activeCategory = getCategory(selectedPosLabel || undefined);

  return (
    <div className={styles.tacticalBoard}>
      {/* Top Header Row (Logo + Team + Formation) */}
      <div className={styles.boardHeader}>
        {logoUrl && <img src={logoUrl} alt={`${teamName} logo`} className={styles.teamLogo} />}
        <span className={styles.teamTitle}>{teamName}</span>
        {onFormationChange && (
          <select
            className={styles.formationSelect}
            value={formationName}
            onChange={(e) => onFormationChange(e.target.value)}
          >
            {Object.keys(FORMATIONS).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        )}
      </div>

      {/* Content Row: Pitch (Left) + Squad (Right) */}
      <div className={styles.boardContent}>
        {/* Main Pitch Area */}
        <div className={styles.pitchArea}>
          <Pitch
            formation={formation}
            lineup={lineup}
            players={players}
            onNodeClick={handleNodeClick}
            selectedNodeIndex={selectedSlot}
          />
        </div>

        {/* Side Panel (Adaptive) */}
        <div className={`${styles.sidePanel} ${selectedSlot !== null ? styles.open : ''}`}>
          <SquadPanel
            players={players}
            onSelectPlayer={handlePlayerSelect}
            selectedPosIndex={selectedSlot}
            activeCategory={activeCategory || undefined}
          />
        </div>
      </div>
    </div>
  );
}
