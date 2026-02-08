import { useState, useEffect, useRef, type MutableRefObject } from 'react';
import { db, type TimerState } from '../../db/db';
import styles from './WatchMode.module.css';

interface StopwatchProps {
  matchId: string;
  initialState?: TimerState;
  compact?: boolean;
  /** When false, timer state is not persisted to Dexie (e.g. snapshot mode). Default true. */
  persistToDb?: boolean;
  /** Optional ref to sync current elapsed ms for parent (e.g. snapshot mode getTime()). */
  syncTimeRef?: MutableRefObject<number>;
  /** Optional ref to sync current timer state for snapshot save (elapsedMs = totalMs, running: false). */
  syncTimerStateRef?: MutableRefObject<TimerState | null>;
}

export function Stopwatch({ matchId, initialState, compact = false, persistToDb = true, syncTimeRef, syncTimerStateRef }: StopwatchProps) {
  // Local state for display
  const [now, setNow] = useState(Date.now());
  const [state, setState] = useState<TimerState>(initialState || {
    phase: '1H',
    running: false,
    startedAtMs: null,
    elapsedMs: 0
  });

  const intervalRef = useRef<number | null>(null);

  // Sync with (throttled/effect based handling)
  const saveState = async (newState: TimerState) => {
    setState(newState);
    if (persistToDb) {
      await db.matches.update(matchId, { timerState: newState });
    }
  };

  // Timer tick effect
  useEffect(() => {
    if (state.running) {
      intervalRef.current = window.setInterval(() => {
        setNow(Date.now());
      }, 200); // 5fps update is enough for UI
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.running]);

  // Calculate display time
  const totalMs = state.running && state.startedAtMs
    ? (now - state.startedAtMs) + state.elapsedMs
    : state.elapsedMs;

  // Sync time/state to parent refs when provided (e.g. snapshot mode)
  useEffect(() => {
    if (syncTimeRef) syncTimeRef.current = totalMs;
    if (syncTimerStateRef) {
      syncTimerStateRef.current = { ...state, elapsedMs: totalMs, startedAtMs: null, running: false };
    }
  }, [totalMs, state, syncTimeRef, syncTimerStateRef]);

  const totalSeconds = Math.floor(totalMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Formatting phase
  const getPhaseLabel = (p: string) => {
    if (p === '1H') return '1st Half';
    if (p === '2H') return '2nd Half';
    return p;
  };

  // Handlers
  const togglePlay = () => {
    if (state.running) {
      // Pause
      const currentRunDuration = state.startedAtMs ? (Date.now() - state.startedAtMs) : 0;
      saveState({
        ...state,
        running: false,
        startedAtMs: null,
        elapsedMs: state.elapsedMs + currentRunDuration
      });
    } else {
      // Start
      saveState({
        ...state,
        running: true,
        startedAtMs: Date.now(),
      });
    }
  };

  const togglePhase = () => {
    // Only allow changing phase if paused? Or reset time on phase change?
    // User requirement: "Timer must survive page reload". 
    // Typical app: Switch 1H -> 2H resets timer to 45:00 or 00:00?
    // Simple approach: Just switch label, keep timer running or let user reset.
    // Let's toggle 1H <-> 2H.
    const newPhase = state.phase === '1H' ? '2H' : '1H';
    // Ideally we might want to reset timer on phase switch, but let's just switch phase for now 
    // and let user press reset if they want.
    saveState({ ...state, phase: newPhase });
  };

  const resetTimer = () => {
    if (confirm('Reset timer?')) {
      saveState({
        ...state,
        running: false,
        startedAtMs: null,
        elapsedMs: 0
      });
      setNow(Date.now());
    }
  };

  if (compact) {
    return (
      <div className={styles.compactStopwatch}>
        <div className={styles.compactPhase} onClick={togglePhase} title="Click to toggle phase">
          {state.phase}
        </div>
        <span className={styles.compactTimer}>{timeString}</span>

        <div className={styles.compactControls}>
          <button
            className={`${styles.compactBtn} ${state.running ? styles.pauseBtn : styles.startBtn}`}
            onClick={togglePlay}
          >
            {state.running ? '❚❚' : '▶'}
          </button>

          <button
            className={styles.resetBtn}
            onClick={resetTimer}
            style={{ width: 28, height: 28, fontSize: '0.9rem' }}
          >
            ⟲
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stopwatchContainer}>
      {/* Large Digital Timer */}
      <div className={styles.statsTimer}>
        <div className={styles.phaseBadge} onClick={togglePhase} title="Click to toggle phase">
          {getPhaseLabel(state.phase)}
        </div>
        <span className={styles.timerDigits}>{timeString}</span>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <button
          className={`${styles.mainBtn} ${state.running ? styles.pauseBtn : styles.startBtn}`}
          onClick={togglePlay}
        >
          {state.running ? 'Pause' : 'Start'}
        </button>

        <button className={styles.resetBtn} onClick={resetTimer}>
          ⟲
        </button>
      </div>
    </div>
  );
}
