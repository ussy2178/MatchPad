import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useEffect, useRef, useMemo } from 'react';
import { db, type Player, type TimerState } from '../../db/db';
import { Stopwatch } from './Stopwatch';
import { HalfPitch } from './HalfPitch';
import { PlayerActionModal } from './PlayerActionModal';
import { SubstitutionModal } from './SubstitutionModal';
import { GoalModal } from './GoalModal';
import { TeamStampModal } from './TeamStampModal';
import { FormationChangeModal } from './FormationChangeModal';
import { NotesModal } from './NotesModal';
import { TeamColorModal } from './TeamColorModal';
import { PlayerSelectionModal } from './PlayerSelectionModal';
import { SquadAccordion } from './SquadAccordion';
import { AddPlayerModal } from '../players/AddPlayerModal';
import { FORMATIONS, type FormationName } from '../../constants/formations';
import { DEFAULT_MATCH_TEAM_COLOR } from '../../db/seeds';
import { saveMatch, getEligibleSubstitutes, computeLineupFromEvents, computeFormationFromEvents, normalizeMatchEvents, type MatchRecord, type PlayerStats, type WatchModeState, type MatchNotes } from '../../utils/matchStorage';
import { isPlayerEvent } from '../../types/match';
import { reassignLineupToFormation } from '../../utils/formationUtils';
import type { MatchEvent, PlayerEvent, SubstitutionEvent, TeamEvent, TeamEventPayload, FormationChangeEvent } from '../../types/match';
import { formatMatchEvent } from '../../utils/formatMatchEvent';
import { toPastelColor } from '../../utils/colorUtils';
import { MatchContext } from '../../contexts/MatchContext';
import styles from './WatchMode.module.css';

export function WatchMode() {
  const { matchId } = useParams<{ matchId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const snapshot = location.state?.snapshot as WatchModeState | undefined;
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const initialNotes = location.state?.notes as MatchNotes | undefined;

  const isSnapshotMode = !!snapshot;

  const timeRef = useRef(0);
  const timerStateRef = useRef<TimerState | null>(null);
  const [actionPlayerId, setActionPlayerId] = useState<string | null>(null);
  const [subbingPlayerId, setSubbingPlayerId] = useState<string | null>(null);

  // Goal Modal State
  const [goalModalState, setGoalModalState] = useState<{ isOpen: boolean; team: 'home' | 'away' }>({
    isOpen: false,
    team: 'home'
  });

  // Team Stamp Modal State
  const [teamStampModalState, setTeamStampModalState] = useState<{ isOpen: boolean; team: 'home' | 'away' }>({
    isOpen: false,
    team: 'home'
  });

  // Formation Change Modal State
  const [formationChangeModalState, setFormationChangeModalState] = useState<{ isOpen: boolean; team: 'home' | 'away' }>({
    isOpen: false,
    team: 'home'
  });
  const formationChangeFromSubRef = useRef(false);
  const [pendingFormationChangeFromSub, setPendingFormationChangeFromSub] = useState<{
    toFormation: FormationName;
    editedLineup: { [key: number]: string };
  } | null>(null);

  // Local state for events (No persistence required)
  const [localEvents, setLocalEvents] = useState<MatchEvent[]>([]);

  // Lineup state - updated on substitution to reflect on-field players
  const [homeLineupState, setHomeLineupState] = useState<{ [key: number]: string }>({});
  const [awayLineupState, setAwayLineupState] = useState<{ [key: number]: string }>({});
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [matchNotes, setMatchNotes] = useState<MatchNotes>(initialNotes || { firstHalf: '', secondHalf: '', fullMatch: '' });
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [addPlayerModalOpen, setAddPlayerModalOpen] = useState(false);
  const [addPlayerTeamId, setAddPlayerTeamId] = useState<string | null>(null);
  const [teamColorModal, setTeamColorModal] = useState<'home' | 'away' | null>(null);
  const [overrideHomeColor, setOverrideHomeColor] = useState<string | null>(null);
  const [overrideAwayColor, setOverrideAwayColor] = useState<string | null>(null);
  const [assignmentModal, setAssignmentModal] = useState<{ side: 'home' | 'away'; slotId: number } | null>(null);
  const [homeLineupOverrides, setHomeLineupOverrides] = useState<Record<number, string>>({});
  const [awayLineupOverrides, setAwayLineupOverrides] = useState<Record<number, string>>({});
  const [pendingAssignmentAfterAdd, setPendingAssignmentAfterAdd] = useState<{ side: 'home' | 'away'; slotId: number } | null>(null);

  // Restore events from snapshot on mount (normalize for legacy TeamEvent with timestamp)
  useEffect(() => {
    if (snapshot?.events) {
      setLocalEvents(normalizeMatchEvents(snapshot.events));
    }
  }, [snapshot]);

  // Browser back: show exit confirmation and stay on page until user confirms
  useEffect(() => {
    const handlePopState = () => {
      setShowExitConfirm(true);
      window.history.pushState(null, '', window.location.pathname + window.location.search);
    };
    window.history.pushState(null, '', window.location.pathname + window.location.search);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
      date: new Date(),
      homeTeamId: snapshot.homeTeam.id,
      awayTeamId: snapshot.awayTeam.id,
      homeFormation: snapshot.homeFormation,
      awayFormation: snapshot.awayFormation,
      homeLineup: snapshot.initialHomeLineup ?? snapshot.homeLineup,
      awayLineup: snapshot.initialAwayLineup ?? snapshot.awayLineup,
      homeBench: snapshot.homeBench,
      awayBench: snapshot.awayBench,
      timerState: snapshot.timerState,
      homeTeamColor: snapshot.homeTeamColor,
      awayTeamColor: snapshot.awayTeamColor
    },
    homeTeam: snapshot.homeTeam,
    awayTeam: snapshot.awayTeam,
    homePlayers: snapshot.homePlayers,
    awayPlayers: snapshot.awayPlayers
  } : dbData;

  const homePlayers = data?.homePlayers ?? [];
  const awayPlayers = data?.awayPlayers ?? [];
  const playersMap = useMemo(() => {
    const m = new Map<string, { name: string; jerseyNumber: number }>();
    [...homePlayers, ...awayPlayers].forEach(p => m.set(p.id, { name: p.name, jerseyNumber: p.jerseyNumber }));
    return m;
  }, [homePlayers, awayPlayers]);

  const match = data?.match ?? null;
  const effectiveHomeLineup = useMemo(() => {
    if (!match) return {};
    const initial = snapshot?.initialHomeLineup ?? match.homeLineup ?? {};
    return computeLineupFromEvents(initial as { [key: number]: string }, localEvents, 'home');
  }, [snapshot?.initialHomeLineup, match?.homeLineup, localEvents]);
  const effectiveAwayLineup = useMemo(() => {
    if (!match) return {};
    const initial = snapshot?.initialAwayLineup ?? match.awayLineup ?? {};
    return computeLineupFromEvents(initial as { [key: number]: string }, localEvents, 'away');
  }, [snapshot?.initialAwayLineup, match?.awayLineup, localEvents]);

  // Sync lineup state from derived lineup when match/events change
  useEffect(() => {
    setHomeLineupState(effectiveHomeLineup);
    setAwayLineupState(effectiveAwayLineup);
  }, [effectiveHomeLineup, effectiveAwayLineup]);

  const effectiveHomeFormationName = useMemo(() => {
    if (!match) return '4-4-2';
    const initial = match.homeFormation || '4-4-2';
    return computeFormationFromEvents(initial, localEvents, 'home');
  }, [match?.homeFormation, localEvents]);
  const effectiveAwayFormationName = useMemo(() => {
    if (!match) return '4-4-2';
    const initial = match.awayFormation || '4-4-2';
    return computeFormationFromEvents(initial, localEvents, 'away');
  }, [match?.awayFormation, localEvents]);

  // Base lineup from state or effective (events); then fill empty slots from assignment overrides (hooks must stay at top level)
  const baseHomeLineup = Object.keys(homeLineupState).length > 0 ? homeLineupState : effectiveHomeLineup;
  const baseAwayLineup = Object.keys(awayLineupState).length > 0 ? awayLineupState : effectiveAwayLineup;
  const displayHomeLineup = useMemo(() => {
    const out = { ...baseHomeLineup };
    Object.entries(homeLineupOverrides).forEach(([slot, playerId]) => {
      const s = Number(slot);
      if (out[s] == null) out[s] = playerId;
    });
    return out;
  }, [baseHomeLineup, homeLineupOverrides]);
  const displayAwayLineup = useMemo(() => {
    const out = { ...baseAwayLineup };
    Object.entries(awayLineupOverrides).forEach(([slot, playerId]) => {
      const s = Number(slot);
      if (out[s] == null) out[s] = playerId;
    });
    return out;
  }, [baseAwayLineup, awayLineupOverrides]);

  // Bench players for assignment modal (not currently on pitch) — hooks at top level
  const homeBenchForAssignment = useMemo(
    () => homePlayers.filter(p => !Object.values(displayHomeLineup).includes(p.id)),
    [homePlayers, displayHomeLineup]
  );
  const awayBenchForAssignment = useMemo(
    () => awayPlayers.filter(p => !Object.values(displayAwayLineup).includes(p.id)),
    [awayPlayers, displayAwayLineup]
  );

  if (!data) return <div>Loading Match...</div>;
  const { homeTeam, awayTeam } = data;

  const effectiveHomeBench = isSnapshotMode ? (snapshot?.homeBench ?? []) : (match?.homeBench ?? []);
  const effectiveAwayBench = isSnapshotMode ? (snapshot?.awayBench ?? []) : (match?.awayBench ?? []);

  const homeFormation = FORMATIONS[effectiveHomeFormationName as FormationName] || FORMATIONS['4-4-2'];
  const awayFormation = FORMATIONS[effectiveAwayFormationName as FormationName] || FORMATIONS['4-4-2'];

  // Per-match team colors (player marker border); overrides used in snapshot mode
  const effectiveHomeColor = overrideHomeColor ?? match?.homeTeamColor ?? DEFAULT_MATCH_TEAM_COLOR;
  const effectiveAwayColor = overrideAwayColor ?? match?.awayTeamColor ?? DEFAULT_MATCH_TEAM_COLOR;
  const pastelHomeColor = toPastelColor(effectiveHomeColor);
  const pastelAwayColor = toPastelColor(effectiveAwayColor);

  const getPlayer = (id: string) => [...homePlayers, ...awayPlayers].find(p => p.id === id);

  const getSubbingTeamData = () => {
    if (!subbingPlayerId) return null;
    if (homePlayers.some(p => p.id === subbingPlayerId)) {
      return { teamPlayers: homePlayers, lineup: displayHomeLineup, teamSide: 'home' as const };
    }
    if (awayPlayers.some(p => p.id === subbingPlayerId)) {
      return { teamPlayers: awayPlayers, lineup: displayAwayLineup, teamSide: 'away' as const };
    }
    return null;
  };
  const subData = getSubbingTeamData();
  const eligibleSubstitutes = subData
    ? getEligibleSubstitutes(
        subData.teamPlayers,
        subData.lineup,
        subData.teamSide === 'home' ? effectiveHomeBench : effectiveAwayBench
      )
    : [];

  const handleTeamColorSelect = (hex: string) => {
    if (teamColorModal === 'home') {
      if (isSnapshotMode) setOverrideHomeColor(hex);
      else if (match?.id) void db.matches.update(match.id, { homeTeamColor: hex });
    } else if (teamColorModal === 'away') {
      if (isSnapshotMode) setOverrideAwayColor(hex);
      else if (match?.id) void db.matches.update(match.id, { awayTeamColor: hex });
    }
  };

  const handleEmptySlotClick = (side: 'home' | 'away', slotId: number) => {
    setAssignmentModal({ side, slotId });
  };

  const handleAssignmentSelect = (playerId: string) => {
    if (!assignmentModal) return;
    if (assignmentModal.side === 'home') {
      setHomeLineupOverrides(prev => ({ ...prev, [assignmentModal.slotId]: playerId }));
    } else {
      setAwayLineupOverrides(prev => ({ ...prev, [assignmentModal.slotId]: playerId }));
    }
    setAssignmentModal(null);
  };

  const handlePlayerClick = (playerId: string) => {
    setActionPlayerId(playerId);
  };

  const getTime = () => {
    if (isSnapshotMode) return timeRef.current;
    if (!match || !match.timerState) return 0;
    const { running, startedAtMs, elapsedMs } = match.timerState;
    const now = Date.now();
    return running && startedAtMs ? (now - startedAtMs) + elapsedMs : elapsedMs;
  };

  const handleActionSave = async (type: string, subType: string | null, comment?: string, quality?: 'good' | 'bad') => {
    if (!actionPlayerId) return;
    const player = getPlayer(actionPlayerId);
    if (!player) return;
    const isHome = homePlayers.some(p => p.id === actionPlayerId);
    const newEvent: MatchEvent = {
      id: crypto.randomUUID(),
      time: getTime(),
      team: isHome ? 'home' : 'away',
      playerNumber: player.jerseyNumber,
      playerId: player.id,
      type: type as PlayerEvent['type'],
      stampType: subType || undefined,
      quality: type === 'Stamp' ? (quality ?? 'good') : undefined,
      comment
    };
    setLocalEvents(prev => [newEvent, ...prev]);
    setActionPlayerId(null);
  };

  const handleSubstitution = async (inPlayerId: string) => {
    if (!subbingPlayerId || !subData) return;

    const outgoingPlayer = getPlayer(subbingPlayerId);
    const incomingPlayer = getPlayer(inPlayerId);
    if (!outgoingPlayer || !incomingPlayer) return;

    const team = subData.teamSide;
    const lineup = team === 'home' ? displayHomeLineup : displayAwayLineup;
    const posKey = Object.keys(lineup).find(k => lineup[Number(k)] === outgoingPlayer.id);

    const pendingFormation = pendingFormationChangeFromSub;

    // 1. Lineup after sub: with optional formation change, use edited lineup with out→in swap
    let newLineup: { [key: number]: string };
    if (pendingFormation) {
      const slotOfOut = Object.keys(pendingFormation.editedLineup).find(
        k => pendingFormation.editedLineup[Number(k)] === outgoingPlayer.id
      );
      newLineup = { ...pendingFormation.editedLineup };
      if (slotOfOut != null) newLineup[Number(slotOfOut)] = incomingPlayer.id;
    } else if (posKey != null) {
      newLineup = { ...lineup, [Number(posKey)]: incomingPlayer.id };
    } else {
      newLineup = { ...lineup };
    }

    if (team === 'home') {
      setHomeLineupState(newLineup);
    } else {
      setAwayLineupState(newLineup);
    }

    // 2. Substitution event
    const subEvent: SubstitutionEvent = {
      id: crypto.randomUUID(),
      time: getTime(),
      team,
      type: 'Substitution',
      playerInId: incomingPlayer.id,
      playerOutId: outgoingPlayer.id,
      comment: `${incomingPlayer.name} in for ${outgoingPlayer.name}`,
    };
    if (!isSnapshotMode && matchId) {
      await db.events.add({
        id: subEvent.id,
        matchId,
        playerId: incomingPlayer.id,
        type: 'Substitution',
        time: subEvent.time,
        comment: subEvent.comment,
        createdAt: new Date()
      });
    }
    setLocalEvents(prev => [subEvent, ...prev]);

    // 3. If formation change was selected during sub flow, add formation change event (same “single” action)
    if (pendingFormation) {
      const fromFormation = team === 'home' ? effectiveHomeFormationName : effectiveAwayFormationName;
      const formationEvent: FormationChangeEvent = {
        id: crypto.randomUUID(),
        time: getTime(),
        type: 'FORMATION_CHANGE',
        team,
        fromFormation,
        toFormation: pendingFormation.toFormation,
        lineupSnapshot: newLineup,
      };
      setLocalEvents(prev => [formationEvent, ...prev]);
      setPendingFormationChangeFromSub(null);
    }

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

  const handleFormationChange = (team: 'home' | 'away', toFormation: string, editedLineup?: { [key: number]: string }) => {
    const fromFormation = team === 'home' ? effectiveHomeFormationName : effectiveAwayFormationName;
    const currentLineup = team === 'home' ? displayHomeLineup : displayAwayLineup;
    const lineupSnapshot = editedLineup && Object.keys(editedLineup).length > 0
      ? editedLineup
      : reassignLineupToFormation(currentLineup, fromFormation, toFormation);
    const event: FormationChangeEvent = {
      id: crypto.randomUUID(),
      time: getTime(),
      type: 'FORMATION_CHANGE',
      team,
      fromFormation,
      toFormation,
      lineupSnapshot,
    };
    setLocalEvents(prev => [event, ...prev]);
  };

  const handleTeamStampSubmit = (event: TeamEventPayload) => {
    const toPush: TeamEvent = {
      ...event,
      id: crypto.randomUUID(),
      time: getTime(),
    };
    setLocalEvents(prev => [toPush, ...prev]);
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
      if (!isPlayerEvent(ev) || !ev.playerId) return;

      const players = ev.team === 'home' ? homePlayers : awayPlayers;
      const player = players.find(p => p.id === ev.playerId);

      if (player) {
        if (!summary[player.id]) {
          summary[player.id] = {
            name: player.name,
            counts: { pass: 0, shot: 0, defense: 0, goal: 0 }
          };
        }

        const typeKey = ev.type === 'Goal' ? 'goal' : (ev.stampType ?? 'other');

        if (summary[player.id].counts[typeKey] === undefined) {
          summary[player.id].counts[typeKey] = 0;
        }
        summary[player.id].counts[typeKey]++;
      }
    });

    // Create Snapshot for Replay (use display lineups so assignment overrides are included)
    const m = match ?? snapshot;
    const matchId = m && 'id' in m ? m.id : (snapshot?.matchId ?? '');
    const currentSnapshot: WatchModeState = {
      matchId,
      homeTeam: homeTeam!,
      awayTeam: awayTeam!,
      homePlayers,
      awayPlayers,
      initialHomeLineup: match?.homeLineup ?? snapshot?.initialHomeLineup ?? snapshot?.homeLineup ?? {},
      initialAwayLineup: match?.awayLineup ?? snapshot?.initialAwayLineup ?? snapshot?.awayLineup ?? {},
      homeLineup: displayHomeLineup,
      awayLineup: displayAwayLineup,
      homeBench: effectiveHomeBench,
      awayBench: effectiveAwayBench,
      homeFormation: match?.homeFormation ?? snapshot?.homeFormation ?? '4-4-2',
      awayFormation: match?.awayFormation ?? snapshot?.awayFormation ?? '4-4-2',
      timerState: isSnapshotMode ? (timerStateRef.current ?? match?.timerState) : match?.timerState,
      events: localEvents,
      homeTeamColor: isSnapshotMode ? (overrideHomeColor ?? snapshot?.homeTeamColor) : match?.homeTeamColor,
      awayTeamColor: isSnapshotMode ? (overrideAwayColor ?? snapshot?.awayTeamColor) : match?.awayTeamColor
    };

    const record: MatchRecord = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      homeTeam: homeTeam?.name ?? 'Home',
      awayTeam: awayTeam?.name ?? 'Away',
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
      <MatchContext.Provider value={{ homeTeamColor: effectiveHomeColor, awayTeamColor: effectiveAwayColor }}>
      <div className={styles.fixedHeader}>
        <header className={styles.watchHeader}>
          {/* Left: Back (Match Pad) - opens exit confirmation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              type="button"
              className={styles.homeLink}
              onClick={() => setShowExitConfirm(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}
            >
              Match Pad
            </button>
          </div>

          {/* Center: Stopwatch (Compact) - aligned with score below */}
          <div className={styles.headerCenter}>
            <Stopwatch
              matchId={match?.id ?? snapshot?.matchId ?? ''}
              initialState={match?.timerState}
              compact={true}
              persistToDb={!isSnapshotMode}
              syncTimeRef={isSnapshotMode ? timeRef : undefined}
              syncTimerStateRef={isSnapshotMode ? timerStateRef : undefined}
            />
          </div>

          {/* Right: Actions */}
          <div className={styles.headerRight}>
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
              Save
            </button>
          </div>
        </header>

        {/* Score Panel */}
        <div className={styles.scorePanel}>
          <div className={styles.teamsHeader}>
            {/* Home Team */}
            <div className={styles.teamBadge}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button className={styles.goalBtn} onClick={() => setGoalModalState({ isOpen: true, team: 'home' })}>⚽</button>
                <button
                  className={`${styles.goalBtn} ${styles.teamStampBtn}`}
                  onClick={() => setTeamStampModalState({ isOpen: true, team: 'home' })}
                  title="Team Stamp"
                >
                  Team
                </button>
                <button
                  className={`${styles.goalBtn} ${styles.teamStampBtn}`}
                  onClick={() => setFormationChangeModalState({ isOpen: true, team: 'home' })}
                  title="Formation"
                >
                  Formation
                </button>
              </div>
              {homeTeam?.logoPath && <img src={homeTeam.logoPath} alt="Home" />}
              <span>{homeTeam?.name}</span>
              <button
                type="button"
                className={effectiveHomeColor.toLowerCase() === '#ffffff' ? `${styles.teamColorDot} ${styles.teamColorDotWhite}` : styles.teamColorDot}
                style={{ backgroundColor: effectiveHomeColor }}
                onClick={() => setTeamColorModal('home')}
                title="Change team color"
                aria-label="Change home team color"
              />
            </div>

            <div className={styles.vsBadge}>
              <div className={styles.liveScore}>{homeScore} - {awayScore}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>VS</div>
            </div>

            {/* Away Team */}
            <div className={styles.teamBadge}>
              <span>{awayTeam?.name}</span>
              <button
                type="button"
                className={effectiveAwayColor.toLowerCase() === '#ffffff' ? `${styles.teamColorDot} ${styles.teamColorDotWhite}` : styles.teamColorDot}
                style={{ backgroundColor: effectiveAwayColor }}
                onClick={() => setTeamColorModal('away')}
                title="Change team color"
                aria-label="Change away team color"
              />
              {awayTeam?.logoPath && <img src={awayTeam.logoPath} alt="Away" />}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  className={`${styles.goalBtn} ${styles.teamStampBtn}`}
                  onClick={() => setFormationChangeModalState({ isOpen: true, team: 'away' })}
                  title="Formation"
                >
                  Formation
                </button>
                <button
                  className={`${styles.goalBtn} ${styles.teamStampBtn}`}
                  onClick={() => setTeamStampModalState({ isOpen: true, team: 'away' })}
                  title="Team Stamp"
                >
                  Team
                </button>
                <button className={styles.goalBtn} onClick={() => setGoalModalState({ isOpen: true, team: 'away' })}>⚽</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.scrollableContent}>
        <div className={styles.matchRowWrapper}>
          <div className={styles.columnHome}>
            <SquadAccordion
              side="home"
              players={homePlayers}
              lineup={displayHomeLineup}
              onPlayerClick={handlePlayerClick}
              expanded={true}
              onToggle={() => {}}
              alwaysExpanded
              teamColor={pastelHomeColor}
            />
          </div>
          <div className={styles.columnPitch}>
            {/* Debug: ensure field always mounts; formation/lineup passed to HalfPitch below */}
            {(() => {
              // eslint-disable-next-line no-console
              console.log('Field render check', { homeFormation, homeLineup: displayHomeLineup, awayFormation, awayLineup: displayAwayLineup });
              return null;
            })()}
            <section className={styles.pitchSection}>
              <div className={styles.pitchWrapper}>
                <div className={styles.pitchRow}>
                  <div className={styles.fullPitch}>
                    <div className={styles.pitchBoundary} />
                    <div className={styles.leftPenalty} />
                    <div className={styles.leftGoal} />
                    <div className={styles.rightPenalty} />
                    <div className={styles.rightGoal} />

                    <HalfPitch
                      side="home"
                      formation={homeFormation}
                      lineup={displayHomeLineup}
                      players={homePlayers}
                      onNodeClick={handlePlayerClick}
                      onEmptySlotClick={(slotId) => handleEmptySlotClick('home', slotId)}
                      showNames={true}
                      primaryColor={effectiveHomeColor}
                    />
                    <HalfPitch
                      side="away"
                      formation={awayFormation}
                      lineup={displayAwayLineup}
                      players={awayPlayers}
                      onNodeClick={handlePlayerClick}
                      onEmptySlotClick={(slotId) => handleEmptySlotClick('away', slotId)}
                      showNames={true}
                      primaryColor={effectiveAwayColor}
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
          <div className={styles.columnAway}>
            <SquadAccordion
              side="away"
              players={awayPlayers}
              lineup={displayAwayLineup}
              onPlayerClick={handlePlayerClick}
              expanded={true}
              onToggle={() => {}}
              alwaysExpanded
              teamColor={pastelAwayColor}
            />
          </div>
        </div>

        <div className={styles.eventLogPanel}>
          <h3>Match Events</h3>
          {localEvents.length === 0 ? (
            <p className={styles.eventsPlaceholder}>No events recorded yet.</p>
          ) : (
            <div className={styles.eventList}>
              {localEvents.map(ev => {
                const timeMs = ev.time;
                const minutes = Math.floor(timeMs / 60000);
                const seconds = Math.floor((timeMs % 60000) / 1000);
                const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                const formatted = formatMatchEvent(ev, playersMap);
                const team = ev.team === 'home' ? homeTeam : awayTeam;
                const isTeamEvent = ev.type === 'team';
                const showTeamName = isTeamEvent || ev.type === 'FORMATION_CHANGE';

                return (
                  <div key={ev.id} className={styles.eventItem}>
                    <span className={styles.eventTime}>[{timeStr}]</span>
                    {showTeamName ? (
                      <>
                        {team?.logoPath ? (
                          <img src={team.logoPath} alt={team.name} className={styles.eventTeamLogo} />
                        ) : (
                          <span className={`${styles.eventTeam} ${ev.team === 'home' ? styles.homeTag : styles.awayTag}`}>
                            {ev.team === 'home' ? 'H' : 'A'}
                          </span>
                        )}
                        <span className={styles.eventTeamName}>{team?.name ?? (ev.team === 'home' ? 'Home' : 'Away')}</span>
                      </>
                    ) : team?.logoPath ? (
                      <img src={team.logoPath} alt={team.name} className={styles.eventTeamLogo} />
                    ) : (
                      <span className={`${styles.eventTeam} ${ev.team === 'home' ? styles.homeTag : styles.awayTag}`}>
                        {ev.team === 'home' ? 'Home' : 'Away'}
                      </span>
                    )}
                    {(ev.type === 'Stamp' || ev.type === 'team') && 'quality' in ev && (
                      <span className={`${styles.qualityBadge} ${(ev.quality ?? 'good') === 'good' ? styles.qualityGood : styles.qualityBad}`}>
                        {(ev.quality ?? 'good') === 'good' ? '🟢 Good' : '🔴 Bad'}
                      </span>
                    )}
                    <span
                      className={`${styles.eventType} ${ev.type === 'Substitution' ? styles.eventTypeSubstitution : ''}`}
                      style={ev.type === 'Goal' ? { color: '#e11d48', fontWeight: '900' } : {}}
                    >
                      {formatted}
                    </span>
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
        teamName={actionPlayerId ? (homePlayers.some(p => p.id === actionPlayerId) ? homeTeam?.name : awayTeam?.name) : undefined}
        playerName={actionPlayerId ? getPlayer(actionPlayerId)?.name : ''}
        onSubstituteClick={actionPlayerId ? () => { setSubbingPlayerId(actionPlayerId); setActionPlayerId(null); } : undefined}
      />

      <SubstitutionModal
        isOpen={!!subbingPlayerId}
        onClose={() => {
          setSubbingPlayerId(null);
          setPendingFormationChangeFromSub(null);
        }}
        outPlayer={subbingPlayerId ? (() => {
          const p = getPlayer(subbingPlayerId);
          return p ? { id: p.id, name: p.name, jerseyNumber: p.jerseyNumber } : null;
        })() : null}
        eligibleInPlayers={eligibleSubstitutes}
        onSelect={handleSubstitution}
        onAddPlayerClick={subbingPlayerId && subData ? () => {
          setAddPlayerTeamId((subData.teamSide === 'home' ? (match?.homeTeamId ?? snapshot?.homeTeam?.id) : (match?.awayTeamId ?? snapshot?.awayTeam?.id)) ?? null);
          setAddPlayerModalOpen(true);
        } : undefined}
        onOpenFormationChange={subbingPlayerId && subData ? () => {
          formationChangeFromSubRef.current = true;
          setFormationChangeModalState({ isOpen: true, team: subData.teamSide });
        } : undefined}
        pendingFormationChange={pendingFormationChangeFromSub ? { toFormation: pendingFormationChangeFromSub.toFormation } : null}
      />

      {addPlayerTeamId && (
        <AddPlayerModal
          teamId={addPlayerTeamId}
          isOpen={addPlayerModalOpen}
          onClose={() => {
            setAddPlayerModalOpen(false);
            setAddPlayerTeamId(null);
            setPendingAssignmentAfterAdd(null);
          }}
          onPlayerCreated={(player) => {
            if (pendingAssignmentAfterAdd) {
              if (pendingAssignmentAfterAdd.side === 'home') {
                setHomeLineupOverrides(prev => ({ ...prev, [pendingAssignmentAfterAdd.slotId]: player.id }));
              } else {
                setAwayLineupOverrides(prev => ({ ...prev, [pendingAssignmentAfterAdd.slotId]: player.id }));
              }
              setAssignmentModal(null);
              setPendingAssignmentAfterAdd(null);
            }
            setAddPlayerModalOpen(false);
            setAddPlayerTeamId(null);
          }}
        />
      )}

      <FormationChangeModal
        isOpen={formationChangeModalState.isOpen}
        team={formationChangeModalState.team}
        teamName={formationChangeModalState.team === 'home' ? (homeTeam?.name ?? 'Home') : (awayTeam?.name ?? 'Away')}
        currentFormation={formationChangeModalState.team === 'home' ? effectiveHomeFormationName : effectiveAwayFormationName}
        onConfirm={(toFormation, editedLineup) => {
          if (formationChangeFromSubRef.current) {
            setPendingFormationChangeFromSub({ toFormation, editedLineup: editedLineup ?? {} });
            formationChangeFromSubRef.current = false;
            setFormationChangeModalState(prev => ({ ...prev, isOpen: false }));
          } else {
            handleFormationChange(formationChangeModalState.team, toFormation, editedLineup);
            setFormationChangeModalState(prev => ({ ...prev, isOpen: false }));
          }
        }}
        onClose={() => {
          formationChangeFromSubRef.current = false;
          setFormationChangeModalState(prev => ({ ...prev, isOpen: false }));
        }}
        lineup={formationChangeModalState.team === 'home' ? displayHomeLineup : displayAwayLineup}
        players={formationChangeModalState.team === 'home' ? homePlayers : awayPlayers}
      />

      {teamStampModalState.isOpen && (
        <TeamStampModal
          team={teamStampModalState.team}
          onSubmit={handleTeamStampSubmit}
          onClose={() => setTeamStampModalState({ ...teamStampModalState, isOpen: false })}
        />
      )}

      <GoalModal
        isOpen={goalModalState.isOpen}
        onClose={() => setGoalModalState({ ...goalModalState, isOpen: false })}
        onSave={handleGoalSave}
        teamName={goalModalState.team === 'home' ? homeTeam?.name || 'Home' : awayTeam?.name || 'Away'}
        players={goalModalState.team === 'home'
          ? getActivePlayers(homePlayers, effectiveHomeLineup)
          : getActivePlayers(awayPlayers, effectiveAwayLineup)
        }
      />

      <NotesModal
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        notes={matchNotes}
        onChange={setMatchNotes}
      />

      {/* Exit match confirmation */}
      {showExitConfirm && (
        <div className={styles.modalOverlay} onClick={() => setShowExitConfirm(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div className={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>試合を終了しますか？</h3>
              <button type="button" className={styles.closeBtn} onClick={() => setShowExitConfirm(false)} aria-label="Close">
                ×
              </button>
            </div>
            <p style={{ padding: 16, margin: 0, color: 'var(--color-text-sub)' }}>
              保存していない変更は失われます。
            </p>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowExitConfirm(false)}>
                キャンセル
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={() => {
                  setShowExitConfirm(false);
                  navigate('/');
                }}
                style={{ background: '#dc2626' }}
              >
                試合を終了
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Team color modal (Match Pad) */}
      {teamColorModal && (
        <TeamColorModal
          isOpen={true}
          onClose={() => setTeamColorModal(null)}
          teamSide={teamColorModal}
          teamName={teamColorModal === 'home' ? (homeTeam?.name ?? 'Home') : (awayTeam?.name ?? 'Away')}
          currentColor={teamColorModal === 'home' ? effectiveHomeColor : effectiveAwayColor}
          onSelect={handleTeamColorSelect}
        />
      )}

      {/* Assign player to empty slot (Match Pad) */}
      {assignmentModal && (
        <PlayerSelectionModal
          isOpen={true}
          onClose={() => setAssignmentModal(null)}
          title="Assign player to position"
          benchPlayers={assignmentModal.side === 'home' ? homeBenchForAssignment : awayBenchForAssignment}
          onSelect={handleAssignmentSelect}
          onAddPlayerClick={() => {
            setPendingAssignmentAfterAdd({ side: assignmentModal.side, slotId: assignmentModal.slotId });
            setAddPlayerTeamId(assignmentModal.side === 'home' ? (homeTeam?.id ?? '') : (awayTeam?.id ?? ''));
            setAddPlayerModalOpen(true);
          }}
        />
      )}
      </MatchContext.Provider>
    </div>
  );
}
