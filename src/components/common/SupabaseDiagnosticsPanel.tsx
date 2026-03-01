import { useEffect, useState, type CSSProperties } from 'react';
import {
  runSupabaseProbeOnce,
  supabaseEnvDiagnostics,
  type SupabaseProbeResult,
} from '../../lib/supabase';

const DIAGNOSTICS_VISIBLE_MS = 15000;
const SHOW_DIAGNOSTICS_EVENT = 'show-supabase-diagnostics';

const panelStyle: CSSProperties = {
  position: 'fixed',
  right: '10px',
  bottom: '10px',
  zIndex: 1200,
  background: 'rgba(17, 24, 39, 0.9)',
  color: '#e5e7eb',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: '8px',
  padding: '8px 10px',
  fontSize: '11px',
  lineHeight: 1.35,
  maxWidth: '260px',
};

const warningStyle: CSSProperties = {
  marginTop: '6px',
  color: '#fca5a5',
  fontWeight: 600,
};

export function SupabaseDiagnosticsPanel() {
  const canShow =
    import.meta.env.DEV &&
    import.meta.env.VITE_ENABLE_SUPABASE_DIAGNOSTICS === 'true';
  const [probe, setProbe] = useState<SupabaseProbeResult | null>(null);
  const [visible, setVisible] = useState(canShow);

  useEffect(() => {
    if (!canShow) return;

    runSupabaseProbeOnce().then(setProbe).catch((e) => {
      console.error('[supabase] probe failed to run', e);
      setProbe({ status: null, errorMessage: String(e), rowsLength: 0 });
    });
  }, [canShow]);

  useEffect(() => {
    if (!canShow || !visible) return;
    const timer = window.setTimeout(() => {
      setVisible(false);
    }, DIAGNOSTICS_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [canShow, visible]);

  useEffect(() => {
    if (!canShow) return;
    const onShow = () => setVisible(true);
    window.addEventListener(SHOW_DIAGNOSTICS_EVENT, onShow);
    return () => window.removeEventListener(SHOW_DIAGNOSTICS_EVENT, onShow);
  }, [canShow]);

  if (!canShow || !visible) return null;

  const envMissing = !supabaseEnvDiagnostics.hasSupabaseUrl || !supabaseEnvDiagnostics.hasSupabaseAnonKey;

  return (
    <aside style={panelStyle} aria-live="polite">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <strong>Supabase diagnostics (DEV)</strong>
        <button
          type="button"
          onClick={() => setVisible(false)}
          style={{
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'transparent',
            color: '#e5e7eb',
            borderRadius: '4px',
            width: '20px',
            height: '20px',
            lineHeight: 1,
            cursor: 'pointer',
          }}
          aria-label="Close diagnostics"
        >
          ×
        </button>
      </div>
      <div>URL env: {String(supabaseEnvDiagnostics.hasSupabaseUrl)}</div>
      <div>KEY env: {String(supabaseEnvDiagnostics.hasSupabaseAnonKey)}</div>
      <div>Host: {supabaseEnvDiagnostics.supabaseHostname ?? '-'}</div>
      <div>
        Probe: status={probe?.status ?? '-'}, rows={probe?.rowsLength ?? '-'}
        {probe?.errorMessage ? `, error=${probe.errorMessage}` : ''}
      </div>
      {envMissing && (
        <div style={warningStyle}>
          Supabase env missing at build time. Rebuild after setting .env
        </div>
      )}
    </aside>
  );
}
