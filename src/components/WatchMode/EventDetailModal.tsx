import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { MatchEvent } from '../../types/match';
import { isFormationChangeEvent, isSubstitutionEvent, isTeamEvent } from '../../types/match';
import { formatMatchEvent, STAMP_LABELS } from '../../utils/formatMatchEvent';
import { formatMatchTime } from '../../utils/matchTimeFormat';
import type { TimerState } from '../../db/db';
import styles from './WatchMode.module.css';

export interface PlayerInfo {
  name: string;
  jerseyNumber: number;
}

export interface EventDetailModalProps {
  isOpen: boolean;
  event: MatchEvent | null;
  playersMap: Map<string, PlayerInfo>;
  /** Optional timer state for time display (phase-based 45+X / 90+X or MM:SS). */
  timerState?: TimerState | null;
  onClose: () => void;
  /** When provided, comment and time are editable and Save button updates the event. */
  onSave?: (updatedEvent: MatchEvent) => void;
  /** When provided, Delete button is shown; called with event id on confirm. */
  onDelete?: (eventId: string) => void;
}

const MAX_MINUTES = 120;
const MAX_SECONDS = 59;
const MINUTE_OPTIONS = Array.from({ length: MAX_MINUTES + 1 }, (_, i) => i);
const SECOND_OPTIONS = Array.from({ length: MAX_SECONDS + 1 }, (_, i) => i);

function timeMsToMinSec(timeMs: number): { minutes: number; seconds: number } {
  const totalSeconds = Math.floor(timeMs / 1000);
  return {
    minutes: Math.max(0, Math.min(MAX_MINUTES, Math.floor(totalSeconds / 60))),
    seconds: Math.max(0, Math.min(MAX_SECONDS, totalSeconds % 60)),
  };
}

function minSecToTimeMs(minutes: number, seconds: number): number {
  const m = Math.max(0, Math.min(MAX_MINUTES, Math.floor(minutes)));
  const s = Math.max(0, Math.min(MAX_SECONDS, Math.floor(seconds)));
  return (m * 60 + s) * 1000;
}

const TEAM_STAMP_LABELS: Record<string, string> = {
  buildUp: 'ビルドアップ',
  counter: 'カウンター',
  break: '崩し',
  defense: 'ディフェンス',
};

function getEventTypeLabel(event: MatchEvent): string {
  if (event.type === 'Goal') return 'ゴール';
  if (event.type === 'Stamp') return event.stampType ? `スタンプ (${STAMP_LABELS[event.stampType] ?? event.stampType})` : 'スタンプ';
  if (event.type === 'Substitution') return '選手交代';
  if (event.type === 'team') {
    const stampLabel = TEAM_STAMP_LABELS[event.stamp] ?? event.stamp;
    return `チームプレー (${stampLabel})`;
  }
  if (isFormationChangeEvent(event)) return 'フォーメーション変更';
  return event.type;
}

function getPlayerName(event: MatchEvent, playersMap: Map<string, PlayerInfo>): string {
  if (isTeamEvent(event) || isFormationChangeEvent(event)) {
    return event.team === 'home' ? 'Home' : 'Away';
  }
  if (isSubstitutionEvent(event)) {
    if (event.playerInId && event.playerOutId) {
      const inP = playersMap.get(event.playerInId);
      const outP = playersMap.get(event.playerOutId);
      return outP && inP ? `#${outP.jerseyNumber} ${outP.name} → #${inP.jerseyNumber} ${inP.name}` : '—';
    }
    return event.comment ?? '—';
  }
  const player = event.playerId ? playersMap.get(event.playerId) : null;
  const number = player?.jerseyNumber ?? ('playerNumber' in event ? event.playerNumber : null);
  const name = player?.name ?? (number != null ? `#${number}` : '—');
  return number != null && name ? `#${number} ${name}` : name;
}

export function EventDetailModal({ isOpen, event, playersMap, timerState, onClose, onSave, onDelete }: EventDetailModalProps) {
  const initialComment = event && 'comment' in event ? (event.comment ?? '') : '';
  const initialTime = event ? timeMsToMinSec(event.time) : { minutes: 0, seconds: 0 };
  const [commentDraft, setCommentDraft] = useState(initialComment);
  const [minutesDraft, setMinutesDraft] = useState(initialTime.minutes);
  const [secondsDraft, setSecondsDraft] = useState(initialTime.seconds);

  useEffect(() => {
    if (event) {
      if ('comment' in event) setCommentDraft(event.comment ?? '');
      else setCommentDraft('');
      const { minutes, seconds } = timeMsToMinSec(event.time);
      setMinutesDraft(minutes);
      setSecondsDraft(seconds);
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const typeLabel = getEventTypeLabel(event);
  const playerName = getPlayerName(event, playersMap);
  const timeStr = formatMatchTime(event.time, timerState);
  const formattedSummary = formatMatchEvent(event, playersMap);
  const canEdit = !!onSave;

  const handleSave = () => {
    const timeMs = minSecToTimeMs(minutesDraft, secondsDraft);
    const updated = { ...event, time: timeMs, comment: commentDraft } as MatchEvent;
    onSave?.(updated);
    onClose();
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (window.confirm('Delete this event? This cannot be undone.')) {
      onDelete(event.id);
      onClose();
    }
  };

  const overlay = (
    <div
      className={`${styles.modalOverlay} ${styles.eventDetailModalOverlay}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-detail-title"
    >
      <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '420px', display: 'flex', flexDirection: 'column' }}>
        {/* Title: full width at top */}
        <div className={styles.modalHeader} style={{ width: '100%', flexShrink: 0 }}>
          <div className={styles.modalHeaderTitleBlock} style={{ flex: 1, minWidth: 0 }}>
            <div id="event-detail-title" className={styles.modalHeaderTeamName}>Event Detail</div>
            <div className={styles.modalHeaderPlayerLine}>{formattedSummary}</div>
          </div>
          <div className={styles.modalHeaderActions}>
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">&times;</button>
          </div>
        </div>

        {/* Body: vertical stack */}
        <div style={{ padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0 }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-sub)', marginBottom: '4px' }}>Event type</div>
            <div style={{ fontWeight: 600 }}>{typeLabel}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-sub)', marginBottom: '4px' }}>Player / Team</div>
            <div style={{ fontWeight: 500 }}>{playerName}</div>
          </div>

          {/* Time: 横1行 — 左: mm:ss 入力、右: 修正前の時間 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-sub)', marginBottom: '2px' }}>Time</div>
            {canEdit ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <select
                    value={minutesDraft}
                    onChange={e => setMinutesDraft(Number(e.target.value))}
                    style={{ width: '56px', padding: '10px 8px', fontSize: '1rem', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                    aria-label="Minutes"
                  >
                    {MINUTE_OPTIONS.map(m => (
                      <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                  <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>:</span>
                  <select
                    value={secondsDraft}
                    onChange={e => setSecondsDraft(Number(e.target.value))}
                    style={{ width: '56px', padding: '10px 8px', fontSize: '1rem', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                    aria-label="Seconds"
                  >
                    {SECOND_OPTIONS.map(s => (
                      <option key={s} value={s}>{s.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
                <span style={{ color: 'var(--color-text-sub)', fontSize: '0.9rem', marginLeft: '8px' }} aria-hidden="true">｜</span>
                <span style={{ color: 'var(--color-text-sub)', fontSize: '0.9rem', fontWeight: 500 }}>← {timeStr}</span>
              </div>
            ) : (
              <div style={{ fontWeight: 500 }}>{timeStr}</div>
            )}
          </div>

          {/* Comment: full width below Time */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-sub)' }}>Comment</div>
            {canEdit ? (
              <textarea
                className={styles.commentInput}
                value={commentDraft}
                onChange={e => setCommentDraft(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: '60px' }}
              />
            ) : (
              <div style={{ whiteSpace: 'pre-wrap', minHeight: '1.5em', color: commentDraft ? undefined : 'var(--color-text-sub)' }}>
                {commentDraft || '—'}
              </div>
            )}
          </div>
        </div>

        {/* Footer: Delete left, Save/Cancel right */}
        <div style={{ padding: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                style={{ padding: '8px 16px', background: 'transparent', color: '#b91c1c', border: '1px solid #b91c1c', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                aria-label="Delete event"
              >
                Delete
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {canEdit && (
              <button type="button" className={styles.saveBtn} onClick={handleSave}>
                Save
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 24px',
                background: 'transparent',
                color: 'var(--color-text, #374151)',
                border: '1px solid var(--color-border, #d1d5db)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {canEdit ? 'Cancel' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
