import type { Player } from '../../db/db';
import styles from './WatchMode.module.css';

export interface SquadAccordionProps {
  side: 'home' | 'away';
  players: Player[];
  lineup: Record<number, string>;
  onPlayerClick: (playerId: string) => void;
  expanded: boolean;
  onToggle: () => void;
}

export function SquadAccordion({ side, players, lineup, onPlayerClick, expanded, onToggle }: SquadAccordionProps) {
  const label = side === 'home' ? 'Home Squad' : 'Away Squad';

  return (
    <div className={styles.accordionSection}>
      <div className={styles.accordionHeader} onClick={onToggle}>
        <span>{label}</span>
        <span className={`${styles.chevron} ${expanded ? styles.expanded : ''}`}>▼</span>
      </div>
      <div className={`${styles.accordionContent} ${expanded ? styles.expanded : ''}`}>
        <div className={styles.playerList}>
          {players.map(p => {
            const isStarter = Object.values(lineup).includes(p.id);
            if (!isStarter) return null;
            return (
              <div key={p.id} className={styles.listRow} onClick={() => onPlayerClick(p.id)}>
                <span className={styles.jerseyNum}>{p.jerseyNumber}</span>
                <span className={styles.playerName}>{p.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
