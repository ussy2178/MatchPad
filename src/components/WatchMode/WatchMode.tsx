import { useParams, Link, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useEffect } from 'react';
import { db, type EventType, type Player } from '../../db/db';
import { Stopwatch } from './Stopwatch';
import { HalfPitch } from './HalfPitch';
import { PlayerActionModal } from './PlayerActionModal';
import { BenchModal } from './BenchModal';
import { GoalModal } from './GoalModal';
import { NotesModal } from './NotesModal';
import { FORMATIONS, type FormationName } from '../../constants/formations';
import { saveMatch, type MatchRecord, type PlayerStats, type MatchEvent, type WatchModeState, type MatchNotes } from '../../utils/matchStorage';
import styles from './WatchMode.module.css';

export function WatchMode() {
  const { matchId } = useParams<{ matchId: string }>();
  const location = useLocation();
  const snapshot = location.state?.snapshot as WatchModeState | undefined;
  const initialNotes = location.state?.notes as MatchNotes | undefined;

  const [actionPlayerId, setActionPlayerId] = useState<string | null>(null);
  const [subbingPlayerId, setSubbingPlayerId] = useState<string | null>(null);

  // Goal Modal State
  const [goalModalState, setGoalModalState] = useState<{ isOpen: boolean; team: 'home' | 'away' }>({
    isOpen: false,
    team: 'home'
  });

  // Local state for events (No persistence required)
  const [localEvents, setLocalEvents] = useState<MatchEvent[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [matchNotes, setMatchNotes] = useState<MatchNotes>(initialNotes || { firstHalf: '', secondHalf: '', fullMatch: '' });
  const [showNotesModal, setShowNotesModal] = useState(false);

  // Restore events from snapshot on mount
  useEffect(() => {
    if (snapshot?.events) {
      setLocalEvents(snapshot.events);
    }
  }, [snapshot]);

  const dbData = useLiveQuery(async () => {
    // If we have a snapshot, we don't strictly need DB, but we might check matchId exists?
    // User rule: "If snapshot exists... skip default match setup"
    if (snapshot) return null;

    if (!matchId) return null;
    const match = await db.matches.get(matchId);
    if (!match) return null;

    const homeTeam = await db.teams.get(match.homeTeamId);
    const awayTeam = await db.teams.get(match.awayTeamId);

    // Fetch all players for both teams
    const homePlayers = await db.players.where('teamId').equals(match.homeTeamId).toArray();
    const awayPlayers = await db.players.where('teamId').equals(match.awayTeamId).toArray();

    return { match, homeTeam, awayTeam, homePlayers, awayPlayers };
  }, [matchId, snapshot]);

  // Construct data from snapshot OR dbData
  const data = snapshot ? {
    match: {
      id: snapshot.matchId,
      date: new Date(), // Snapshot doesn't preserve generic match date, using current/dummy
      homeTeamId: snapshot.homeTeam.id,
      awayTeamId: snapshot.awayTeam.id,
      homeFormation: snapshot.homeFormation,
      awayFormation: snapshot.awayFormation,
      homeLineup: snapshot.homeLineup,
      awayLineup: snapshot.awayLineup,
      timerState: snapshot.timerState
    },
    homeTeam: snapshot.homeTeam,
    awayTeam: snapshot.awayTeam,
    homePlayers: snapshot.homePlayers,
    awayPlayers: snapshot.awayPlayers
  } : dbData;


  if (!data) return <div>Loading Match...</div>;
  const { match, homeTeam, awayTeam, homePlayers, awayPlayers } = data;

  const homeFormation = FORMATIONS[match.homeFormation as FormationName] || FORMATIONS['4-4-2'];
  const awayFormation = FORMATIONS[match.awayFormation as FormationName] || FORMATIONS['4-4-2'];

  // Helper to find player
  const getPlayer = (id: string) => [...homePlayers, ...awayPlayers].find(p => p.id === id);

  // Bench Calculation and Subbing Data logic remains same...
  const getBenchPlayers = (teamPlayers: Player[], lineup: { [key: number]: string }) => {
    const starterIds = Object.values(lineup);
    return teamPlayers.filter(p => !starterIds.includes(p.id));
  };

  const getSubbingTeamData = () => {
    if (!subbingPlayerId) return null;
    if (homePlayers.some(p => p.id === subbingPlayerId)) {
      return { teamPlayers: homePlayers, lineup: match.homeLineup, teamSide: 'home' as const };
    }
    if (awayPlayers.some(p => p.id === subbingPlayerId)) {
      return { teamPlayers: awayPlayers, lineup: match.awayLineup, teamSide: 'away' as const };
    }
    return null;
  };
  const subData = getSubbingTeamData();
  const benchPlayers = subData ? getBenchPlayers(subData.teamPlayers, subData.lineup) : [];

  // Handlers
  const handlePlayerClick = (playerId: string) => {
    console.log("WatchMode received click:", playerId);
    setActionPlayerId(playerId);
  };

  const getTime = () => {
    if (!match.timerState) return 0;
    const { running, startedAtMs, elapsedMs } = match.timerState;
    const now = Date.now();
    return running && startedAtMs ? (now - startedAtMs) + elapsedMs : elapsedMs;
  };

  const handleActionSave = async (type: string, subType: string | null, comment?: string) => {
    // ... existing logic ...
    // Reuse but handle async properly
    if (!actionPlayerId) return;
    if (type === 'Substitution') {
      setSubbingPlayerId(actionPlayerId);
      setActionPlayerId(null);
      return;
    }

    // ... existing save logic ...
    const player = getPlayer(actionPlayerId);
    if (!player) return;
    const isHome = homePlayers.some(p => p.id === actionPlayerId);
    const newEvent: MatchEvent = {
      id: crypto.randomUUID(),
      time: getTime(),
      team: isHome ? 'home' : 'away',
      playerNumber: player.jerseyNumber,
      playerId: player.id,
      type: type as any,
      stampType: subType || undefined,
      comment
    };
    setLocalEvents(prev => [newEvent, ...prev]);
    setActionPlayerId(null);
  };

  const handleSubstitution = async (inPlayerId: string) => {
    // ... existing substitution logic ...
    if (!subbingPlayerId || !matchId || !subData) return;
    const lineup = subData.teamSide === 'home' ? match.homeLineup : match.awayLineup;
    const positionKey = Object.keys(lineup).find(key => lineup[Number(key)] === subbingPlayerId);
    if (!positionKey) { console.error("Could not find pos"); return; }

    const newLineup = { ...lineup, [positionKey]: inPlayerId };
    if (subData.teamSide === 'home') {
      await db.matches.update(matchId, { homeLineup: newLineup });
    } else {
      await db.matches.update(matchId, { awayLineup: newLineup });
    }

    const outPlayer = getPlayer(subbingPlayerId);
    await db.events.add({
      id: crypto.randomUUID(),
      matchId,
      playerId: inPlayerId,
      type: 'Substitution',
      time: getTime(),
      comment: `In for ${outPlayer?.name || 'Unknown'}`,
      createdAt: new Date()
    });
    setSubbingPlayerId(null);
  };

  // Goal Handler
  const handleGoalSave = (data: { scorerId: string | null; assistId: string | null; isOwnGoal: boolean }) => {
    const { scorerId, assistId, isOwnGoal } = data;
    const team = goalModalState.team;

    let comment = isOwnGoal ? 'オウンゴール' : '';
    let playerNumber = 0; // Default if OG or unknown

    if (!isOwnGoal && scorerId) {
      const scorer = getPlayer(scorerId);
      if (scorer) {
        comment = `Goal: ${scorer.name}`;
        playerNumber = scorer.jerseyNumber;
      }
    }

    if (assistId) {
      const assist = getPlayer(assistId);
      if (assist) {
        comment += ` (Ast: ${assist.name})`;
      }
    }

    const newEvent: MatchEvent = {
      id: crypto.randomUUID(),
      time: getTime(),
      team,
      playerNumber,
      playerId: scorerId || undefined,
      type: 'Goal',
      comment
    };

    setLocalEvents(prev => [newEvent, ...prev]);
  };

  const handleDeleteEvent = (id: string) => {
    setLocalEvents(prev => prev.filter(ev => ev.id !== id));
  };

  // Helper to filter active players
  const getActivePlayers = (teamPlayers: Player[], lineup: { [key: number]: string }) => {
    const activeIds = Object.values(lineup);
    return teamPlayers.filter(p => activeIds.includes(p.id));
  };

  // Score Calculation
  const homeScore = localEvents.filter(ev => ev.team === 'home' && ev.type === 'Goal').length;
  const awayScore = localEvents.filter(ev => ev.team === 'away' && ev.type === 'Goal').length;

  const handleSaveMatch = async () => {
    // Generate Summary
    const summary: { [key: string]: PlayerStats } = {};

    localEvents.forEach(ev => {
      const players = ev.team === 'home' ? homePlayers : awayPlayers;
      const player = players.find(p => p.jerseyNumber === ev.playerNumber);

      if (player) {
        if (!summary[player.id]) {
          summary[player.id] = {
            name: player.name,
            counts: { pass: 0, shot: 0, defense: 0, goal: 0 }
          };
        }

        const typeKey = ev.type === 'Goal' ? 'goal' : (ev.stampType || 'other');

        // Ensure key exists
        if (summary[player.id].counts[typeKey] === undefined) {
          summary[player.id].counts[typeKey] = 0;
        }
        summary[player.id].counts[typeKey]++;
      }
    });

    // Create Snapshot for Replay
    const currentSnapshot: WatchModeState = {
      matchId: match.id,
      homeTeam: homeTeam!,
      awayTeam: awayTeam!,
      homePlayers,
      awayPlayers,
      homeLineup: match.homeLineup,
      awayLineup: match.awayLineup,
      homeFormation: match.homeFormation,
      awayFormation: match.awayFormation,
      timerState: match.timerState,
      events: localEvents
    };

    const record: MatchRecord = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      homeTeam: homeTeam?.name || 'Home',
      awayTeam: awayTeam?.name || 'Away',
      score: { home: homeScore, away: awayScore },
      events: localEvents,
      playerSummary: summary,
      snapshot: currentSnapshot,
      notes: matchNotes
    };

    try {
      await saveMatch(record);
      setShowSaveModal(true);
    } catch (e) {
      console.error('Failed to save match', e);
      alert('Failed to save match');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.fixedHeader}>
        <header className={styles.watchHeader}>
          <div style={{
            width: '100%', maxWidth: '1200px',
            display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <Link to="/" style={{ textDecoration: 'none', color: '#666' }}>← Home</Link>
            <span style={{ fontWeight: 'bold' }}>Watch Mode</span>
            <div style={{ display: 'flex', gap: '8px', justifySelf: 'end' }}>
              <button
                onClick={() => setShowNotesModal(true)}
                className={styles.saveBtn}
                style={{ fontSize: '0.85rem', padding: '6px 12px', background: '#fff', color: '#333', border: '1px solid #ccc' }}
              >
                Notes
              </button>
              <button
                onClick={handleSaveMatch}
                className={styles.saveBtn}
                style={{ fontSize: '0.85rem', padding: '6px 12px' }}
              >
                Save Match
              </button>
            </div>
          </div>
          <Stopwatch matchId={match.id} initialState={match.timerState} />
        </header>

        <div className={styles.scorePanel}>
          <div className={styles.teamsHeader}>
            {/* Home Team */}
            <div className={styles.teamBadge}>
              <button className={styles.goalBtn} onClick={() => setGoalModalState({ isOpen: true, team: 'home' })}>⚽</button>
              {homeTeam?.logoPath && <img src={homeTeam.logoPath} alt="Home" />}
              <span>{homeTeam?.name}</span>
            </div>

            <div className={styles.vsBadge}>
              <div className={styles.liveScore}>{homeScore} - {awayScore}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>VS</div>
            </div>

            {/* Away Team */}
            <div className={styles.teamBadge}>
              <span>{awayTeam?.name}</span>
              {awayTeam?.logoPath && <img src={awayTeam.logoPath} alt="Away" />}
              <button className={styles.goalBtn} onClick={() => setGoalModalState({ isOpen: true, team: 'away' })}>⚽</button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.scrollableContent}>
        <section className={styles.pitchSection}>
          <div className={styles.pitchWrapper}>
            <div className={styles.pitchRow}>
              <div className={styles.fullPitch}>
                {/* ... pitch rendering ... */}
                <div className={styles.pitchBoundary} />
                <div className={styles.leftPenalty} />
                <div className={styles.leftGoal} />
                <div className={styles.rightPenalty} />
                <div className={styles.rightGoal} />

                <HalfPitch
                  side="home"
                  formation={homeFormation}
                  lineup={match.homeLineup}
                  players={homePlayers}
                  onNodeClick={handlePlayerClick}
                  showNames={false}
                />
                <HalfPitch
                  side="away"
                  formation={awayFormation}
                  lineup={match.awayLineup}
                  players={awayPlayers}
                  onNodeClick={handlePlayerClick}
                  showNames={false}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ... squad section ... */}
        <section className={styles.squadSection}>
          <div className={styles.squadColumn}>
            <h3>Home Squad</h3>
            <div className={styles.playerList}>
              {homePlayers.map(p => {
                const isStarter = Object.values(match.homeLineup).includes(p.id);
                if (!isStarter) return null;
                return (
                  <div key={p.id} className={styles.listRow} onClick={() => handlePlayerClick(p.id)}>
                    <span className={styles.jerseyNum}>{p.jerseyNumber}</span>
                    <span className={styles.playerName}>{p.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.squadColumn}>
            <h3>Away Squad</h3>
            <div className={styles.playerList}>
              {awayPlayers.map(p => {
                const isStarter = Object.values(match.awayLineup).includes(p.id);
                if (!isStarter) return null;
                return (
                  <div key={p.id} className={styles.listRow} onClick={() => handlePlayerClick(p.id)}>
                    <span className={styles.jerseyNum}>{p.jerseyNumber}</span>
                    <span className={styles.playerName}>{p.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className={styles.eventLogPanel}>
          <h3>Match Events</h3>
          {localEvents.length === 0 ? (
            <p className={styles.eventsPlaceholder}>No events recorded yet.</p>
          ) : (
            <div className={styles.eventList}>
              {localEvents.map(ev => {
                const minutes = Math.floor(ev.time / 60000);
                const seconds = Math.floor((ev.time % 60000) / 1000);
                const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

                let displayType = ev.type as string;
                if (ev.type === 'Stamp' && ev.stampType) {
                  const map: Record<string, string> = {
                    pass: 'パス',
                    shot: 'シュート',
                    dribble: 'ドリブル',
                    cross: 'クロス',
                    defense: 'ディフェンス',
                    save: 'セーブ',
                    positioning: 'ポジショニング',
                    running: 'ランニング'
                  };
                  displayType = map[ev.stampType] || ev.stampType;
                } else if (ev.type === 'Goal') {
                  displayType = '⚽ GOAL';
                }

                const team = ev.team === 'home' ? homeTeam : awayTeam;

                return (
                  <div key={ev.id} className={styles.eventItem}>
                    <span className={styles.eventTime}>[{timeStr}]</span>

                    {/* Team Logo or Fallback Label */}
                    {team?.logoPath ? (
                      <img
                        src={team.logoPath}
                        alt={team.name}
                        className={styles.eventTeamLogo}
                      />
                    ) : (
                      <span className={`${styles.eventTeam} ${ev.team === 'home' ? styles.homeTag : styles.awayTag}`}>
                        {ev.team === 'home' ? 'Home' : 'Away'}
                      </span>
                    )}

                    <span className={styles.playerNum}>{ev.playerNumber ? `#${ev.playerNumber}` : '-'}</span>
                    <span className={styles.eventType} style={ev.type === 'Goal' ? { color: '#e11d48', fontWeight: '900' } : {}}>{displayType}</span>
                    {ev.comment && <span className={styles.eventComment}>- {ev.comment}</span>}

                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDeleteEvent(ev.id)}
                      title="Delete Event"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <PlayerActionModal
        isOpen={!!actionPlayerId}
        onClose={() => setActionPlayerId(null)}
        onSave={handleActionSave}
        playerInfo={(() => {
          if (!actionPlayerId) return null;
          const player = getPlayer(actionPlayerId);
          if (!player) return null;
          const isHome = homePlayers.some(p => p.id === player.id);
          return { team: isHome ? 'home' : 'away', number: player.jerseyNumber };
        })()}
        playerName={actionPlayerId ? getPlayer(actionPlayerId)?.name : ''}
      />

      <BenchModal
        isOpen={!!subbingPlayerId}
        onClose={() => setSubbingPlayerId(null)}
        benchPlayers={benchPlayers}
        outPlayerName={subbingPlayerId ? getPlayer(subbingPlayerId)?.name : ''}
        onSelect={handleSubstitution}
      />

      <GoalModal
        isOpen={goalModalState.isOpen}
        onClose={() => setGoalModalState({ ...goalModalState, isOpen: false })}
        onSave={handleGoalSave}
        teamName={goalModalState.team === 'home' ? homeTeam?.name || 'Home' : awayTeam?.name || 'Away'}
        players={goalModalState.team === 'home'
          ? getActivePlayers(homePlayers, match.homeLineup)
          : getActivePlayers(awayPlayers, match.awayLineup)
        }
      />

      <NotesModal
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        notes={matchNotes}
        onChange={setMatchNotes}
      />

      {/* Save Success Modal */}
      {showSaveModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ textAlign: 'center', padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>Match Saved</h3>
            <p style={{ color: 'var(--color-text-sub)', marginBottom: '24px' }}>
              Match record has been saved successfully.
            </p>
            <button
              className={styles.saveBtn}
              onClick={() => setShowSaveModal(false)}
              style={{ width: '100%', padding: '12px' }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
