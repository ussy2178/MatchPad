-- football_players: enforce unique (team_id, jersey_number) for non-null jersey_number
-- Run in Supabase SQL Editor (or your migration runner) with a privileged role.

-- 1) Inspect duplicates first
select
  team_id,
  jersey_number,
  count(*) as duplicate_count
from public.football_players
where jersey_number is not null
group by team_id, jersey_number
having count(*) > 1
order by duplicate_count desc, team_id, jersey_number;

-- 2) Remove duplicates, keep smallest id in each (team_id, jersey_number) group
with ranked as (
  select
    id,
    row_number() over (
      partition by team_id, jersey_number
      order by id asc
    ) as rn
  from public.football_players
  where jersey_number is not null
)
delete from public.football_players p
using ranked r
where p.id = r.id
  and r.rn > 1;

-- 3) Create partial unique index for upsert conflict target
create unique index if not exists football_players_team_jersey_unique_idx
  on public.football_players (team_id, jersey_number)
  where jersey_number is not null;

-- 4) Optional verification: should return zero rows
select
  team_id,
  jersey_number,
  count(*) as duplicate_count
from public.football_players
where jersey_number is not null
group by team_id, jersey_number
having count(*) > 1;
