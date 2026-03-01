import { useEffect, useState, type CSSProperties } from 'react';
import {
  runSupabaseProbeOnce,
  supabaseEnvDiagnostics,
  type SupabaseProbeResult,
} from '../../lib/supabase';

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
  const [probe, setProbe] = useState<SupabaseProbeResult | null>(null);

  useEffect(() => {
    runSupabaseProbeOnce().then(setProbe).catch((e) => {
      console.error('[supabase] probe failed to run', e);
      setProbe({ status: null, errorMessage: String(e), rowsLength: 0 });
    });
  }, []);

  if (!import.meta.env.DEV) return null;

  const envMissing = !supabaseEnvDiagnostics.hasSupabaseUrl || !supabaseEnvDiagnostics.hasSupabaseAnonKey;

  return (
    <aside style={panelStyle} aria-live="polite">
      <div><strong>Supabase diagnostics (DEV)</strong></div>
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
