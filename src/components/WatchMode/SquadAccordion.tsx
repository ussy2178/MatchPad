import type { Player } from '../../db/db';
import { sortPlayersForDisplay } from '../../utils/playerSort';
import styles from './WatchMode.module.css';

export interface SquadAccordionProps {
  side: 'home' | 'away';
  players: Player[];
  lineup: Record<number, string>;
  onPlayerClick: (playerId: string) => void;
  expanded: boolean;
  onToggle: () => void;
  /** When true, list is always expanded and header is not clickable */
  alwaysExpanded?: boolean;
  /** Team color for squad footer tint */
  teamColor?: string;
}

export function SquadAccordion({ side, players, lineup, onPlayerClick, expanded, onToggle, alwaysExpanded, teamColor }: SquadAccordionProps) {
  const label = side === 'home' ? 'Home Squad' : 'Away Squad';
  const isExpanded = alwaysExpanded || expanded;

  return (
    <div className={styles.accordionSection}>
      {!alwaysExpanded && (
        <div
          className={`${styles.accordionHeader} ${alwaysExpanded ? styles.accordionHeaderStatic : ''}`}
          onClick={onToggle}
        >
          <span>{label}</span>
          <span className={`${styles.chevron} ${expanded ? styles.expanded : ''}`}>▼</span>
        </div>
      )}
      <div className={`${styles.accordionContent} ${isExpanded ? styles.expanded : ''}`}>
        <div className={styles.playerList}>
          {sortPlayersForDisplay(players).map(p => {
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
        {teamColor && (
          <div
            className={styles.squadFooter}
            style={{ ['--squad-team-color' as string]: teamColor }}
          />
        )}
      </div>
    </div>
  );
}
