import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import styles from './PWAUpdateBanner.module.css';

export function PWAUpdateBanner() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isWatchMode = /^\/match\/[^/]+\/watch$/.test(location.pathname);
  const canShowDiagnostics =
    import.meta.env.DEV &&
    import.meta.env.VITE_ENABLE_SUPABASE_DIAGNOSTICS === 'true';
  const [dismissed, setDismissed] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (needRefresh) {
      setDismissed(false);
    }
  }, [needRefresh]);

  const applyUpdate = async () => {
    if (isApplying) return;
    setIsApplying(true);
    try {
      await updateServiceWorker(true);
    } catch (e) {
      console.warn('Failed to apply service worker update', e);
    } finally {
      window.location.reload();
    }
  };

  if (isWatchMode) return null;

  return (
    <div className={styles.wrapper}>
      {isHome && (
        <>
          <button
            type="button"
            className={styles.checkButton}
            onClick={applyUpdate}
            disabled={isApplying}
          >
            {isApplying ? 'Updating...' : 'Check update'}
          </button>
          {canShowDiagnostics && (
            <button
              type="button"
              className={`${styles.checkButton} ${styles.diagnosticsButton}`}
              onClick={() => window.dispatchEvent(new Event('show-supabase-diagnostics'))}
            >
              Diagnostics
            </button>
          )}
        </>
      )}

      {needRefresh && !dismissed && (
        <div className={styles.toast} role="status" aria-live="polite">
          <span className={styles.label}>Update available</span>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.updateButton}
              onClick={applyUpdate}
              disabled={isApplying}
            >
              {isApplying ? 'Updating...' : 'Update'}
            </button>
            <button
              type="button"
              className={styles.dismissButton}
              onClick={() => setDismissed(true)}
              disabled={isApplying}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
