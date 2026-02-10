import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './WatchMode.module.css';

const ROW_HEIGHT = 48;
const MINUTES = Array.from({ length: 121 }, (_, i) => i);
const SECONDS = Array.from({ length: 60 }, (_, i) => i);

export interface TimeEditModalProps {
  isOpen: boolean;
  /** Current time in milliseconds. */
  currentMs: number;
  onApply: (totalMs: number) => void;
  onClose: () => void;
}

export function TimeEditModal({ isOpen, currentMs, onApply, onClose }: TimeEditModalProps) {
  const totalSeconds = Math.floor(currentMs / 1000);
  const [minutes, setMinutes] = useState(Math.min(120, Math.floor(totalSeconds / 60)));
  const [seconds, setSeconds] = useState(totalSeconds % 60);

  const minutesRef = useRef<HTMLDivElement>(null);
  const secondsRef = useRef<HTMLDivElement>(null);

  const scrollToValue = useCallback((ref: React.RefObject<HTMLDivElement | null>, index: number) => {
    if (!ref.current) return;
    ref.current.scrollTop = index * ROW_HEIGHT;
  }, []);

  useEffect(() => {
    if (isOpen) {
      const totalSeconds = Math.floor(currentMs / 1000);
      const m = Math.min(120, Math.floor(totalSeconds / 60));
      const s = totalSeconds % 60;
      setMinutes(m);
      setSeconds(s);
      requestAnimationFrame(() => {
        scrollToValue(minutesRef, m);
        scrollToValue(secondsRef, s);
      });
    }
  }, [isOpen, currentMs, scrollToValue]);

  const handleMinutesScroll = () => {
    const el = minutesRef.current;
    if (!el) return;
    const index = Math.round(el.scrollTop / ROW_HEIGHT);
    const clamped = Math.max(0, Math.min(120, index));
    setMinutes(clamped);
  };

  const handleSecondsScroll = () => {
    const el = secondsRef.current;
    if (!el) return;
    const index = Math.round(el.scrollTop / ROW_HEIGHT);
    const clamped = Math.max(0, Math.min(59, index));
    setSeconds(clamped);
  };

  const handleApply = () => {
    const m = Math.max(0, Math.min(120, minutes));
    const s = Math.max(0, Math.min(59, seconds));
    const totalMs = (m * 60 + s) * 1000;
    onApply(totalMs);
    onClose();
  };

  const preview = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modalContent} ${styles.timeEditModalContent}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 style={{ margin: 0 }}>Edit match time</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.timeEditBody}>
          <div className={styles.timeEditPreview}>{preview}</div>

          <div className={styles.timePickerColumns}>
            <div className={styles.timePickerColumn}>
              <div className={styles.timePickerLabel}>Minutes</div>
              <div className={styles.timePickerShadowTop} aria-hidden />
              <div
                ref={minutesRef}
                className={styles.timePickerScroll}
                onScroll={handleMinutesScroll}
                role="listbox"
                aria-label="Minutes"
                tabIndex={0}
              >
                <div className={styles.timePickerPadding} />
                {MINUTES.map((m) => (
                  <div
                    key={m}
                    className={`${styles.timePickerRow} ${m === minutes ? styles.timePickerRowSelected : ''}`}
                    role="option"
                    aria-selected={m === minutes}
                    onClick={() => {
                      setMinutes(m);
                      scrollToValue(minutesRef, m);
                    }}
                  >
                    {m}
                  </div>
                ))}
                <div className={styles.timePickerPadding} />
              </div>
              <div className={styles.timePickerShadowBottom} aria-hidden />
            </div>

            <div className={styles.timePickerColumn}>
              <div className={styles.timePickerLabel}>Seconds</div>
              <div className={styles.timePickerShadowTop} aria-hidden />
              <div
                ref={secondsRef}
                className={styles.timePickerScroll}
                onScroll={handleSecondsScroll}
                role="listbox"
                aria-label="Seconds"
                tabIndex={0}
              >
                <div className={styles.timePickerPadding} />
                {SECONDS.map((s) => (
                  <div
                    key={s}
                    className={`${styles.timePickerRow} ${s === seconds ? styles.timePickerRowSelected : ''}`}
                    role="option"
                    aria-selected={s === seconds}
                    onClick={() => {
                      setSeconds(s);
                      scrollToValue(secondsRef, s);
                    }}
                  >
                    {s.toString().padStart(2, '0')}
                  </div>
                ))}
                <div className={styles.timePickerPadding} />
              </div>
              <div className={styles.timePickerShadowBottom} aria-hidden />
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.saveBtn} onClick={handleApply}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
