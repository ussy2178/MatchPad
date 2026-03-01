import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const hasSupabaseUrl = Boolean(supabaseUrl);
const hasSupabaseAnonKey = Boolean(supabaseAnonKey);
const supabaseHostname = (() => {
  try {
    if (!supabaseUrl) return null;
    return new URL(supabaseUrl).hostname;
  } catch {
    return null;
  }
})();

export const supabaseEnvDiagnostics = {
  hasSupabaseUrl,
  hasSupabaseAnonKey,
  supabaseHostname,
};

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Database features will be disabled.');
}

if (import.meta.env.DEV) {
  console.info('[supabase] env diagnostics', {
    hasViteSupabaseUrl: hasSupabaseUrl,
    hasViteSupabaseAnonKey: hasSupabaseAnonKey,
    hostname: supabaseHostname,
  });
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

export type SupabaseProbeResult = {
  status: number | null;
  errorMessage: string | null;
  rowsLength: number;
};

let probePromise: Promise<SupabaseProbeResult> | null = null;

export function runSupabaseProbeOnce(): Promise<SupabaseProbeResult> {
  if (!import.meta.env.DEV) {
    return Promise.resolve({ status: null, errorMessage: null, rowsLength: 0 });
  }

  if (probePromise) return probePromise;

  if (!hasSupabaseUrl || !hasSupabaseAnonKey) {
    const skipped = {
      status: null,
      errorMessage: 'Supabase env missing at build time',
      rowsLength: 0,
    };
    console.warn('[supabase] probe skipped', skipped);
    probePromise = Promise.resolve(skipped);
    return probePromise;
  }

  probePromise = (async () => {
    const result = await supabase
      .from('football_players')
      .select('id')
      .limit(1);

    const status = typeof result.status === 'number' ? result.status : null;
    const errorMessage = result.error?.message ?? null;
    const rowsLength = Array.isArray(result.data) ? result.data.length : 0;
    const summary = { status, errorMessage, rowsLength };

    console.info('[supabase] probe football_players', summary);
    return summary;
  })();

  return probePromise;
}
