-- Add snapshot column used for WatchMode full restore
alter table public.football_matches
  add column if not exists snapshot jsonb;
