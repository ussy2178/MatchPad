/**
 * Format match time for display. Uses TimerState.phase so that:
 * - During 1H/HT: events after 45 min show as 45+X (X = minutes).
 * - During 2H/FT: events after 90 min show as 90+X (X = minutes).
 * - Otherwise: MM:SS.
 */

export type TimerPhase = '1H' | 'HT' | '2H' | 'FT';

/** Optional phase for display; can be taken from TimerState.phase. */
export interface TimerDisplayOptions {
  phase?: TimerPhase | null;
}

const HALF_45_MS = 45 * 60 * 1000;
const HALF_90_MS = 90 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;

/**
 * Returns display string: "MM:SS", "45+X", or "90+X" (X = minutes) based on time and phase.
 * Events are not modified; this is display-only.
 */
export function formatMatchTime(
  timeMs: number,
  options?: TimerDisplayOptions | { phase?: TimerPhase | null } | null
): string {
  const phase = options?.phase ?? null;

  // 2H/FT: 90分超え → 90+X（Xは分）
  if ((phase === '2H' || phase === 'FT') && timeMs >= HALF_90_MS) {
    const addMin = Math.floor((timeMs - HALF_90_MS) / MS_PER_MINUTE);
    return `90+${addMin}`;
  }
  // 1H/HT: 45分超～90分未満 → 45+X（Xは分）
  if ((phase === '1H' || phase === 'HT') && timeMs >= HALF_45_MS && timeMs < HALF_90_MS) {
    const addMin = Math.floor((timeMs - HALF_45_MS) / MS_PER_MINUTE);
    return `45+${addMin}`;
  }

  const totalSeconds = Math.floor(timeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Always returns MM:SS (e.g. 92:43, 105:07). Used for the Stopwatch top display only.
 * Ignores phase/stoppage; event log continues to use formatMatchTime for 45+X / 90+X.
 */
export function formatTimerDisplayPlain(totalMs: number): string {
  const totalSeconds = Math.floor(totalMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format current timer display (phase-aware 45+X / 90+X). Use formatTimerDisplayPlain for Stopwatch UI.
 */
export function formatTimerDisplay(
  totalMs: number,
  options?: TimerDisplayOptions | { phase?: TimerPhase | null } | null
): string {
  return formatMatchTime(totalMs, options);
}
