-- ============================================================
-- COPA RESTA UM DOS IDIOTAS 2026 — Schema Supabase
-- Cole isso no SQL Editor do Supabase e execute
-- ============================================================

-- Jogadores registrados
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now()
);

-- Partidas da Copa (sincronizadas via football-data.org)
create table if not exists matches (
  id integer primary key,
  home_team text not null,
  away_team text not null,
  home_team_id integer not null,
  away_team_id integer not null,
  utc_date timestamptz not null,
  stage text not null,       -- GROUP_STAGE, ROUND_OF_32, ROUND_OF_16, QUARTER_FINALS, SEMI_FINALS, FINAL
  group_name text,           -- GROUP_A ... GROUP_L
  status text default 'SCHEDULED',
  home_score integer,
  away_score integer,
  winner text                -- HOME_TEAM, AWAY_TEAM, DRAW, null
);

-- Picks dos jogadores (1 por dia por jogador)
create table if not exists picks (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade not null,
  match_id integer references matches(id) not null,
  team_name text not null,
  team_id integer not null,
  phase text not null,       -- groups, r32, r16, qf, sf, final
  pick_date date not null,
  result text,               -- win, draw, loss, no_pick
  lives_lost integer not null default 0,
  is_repeat boolean not null default false,
  created_at timestamptz default now(),
  constraint one_pick_per_day unique (player_id, pick_date)
);

-- ============================================================
-- Row Level Security (leitura aberta, escrita controlada)
-- ============================================================
alter table players enable row level security;
alter table matches enable row level security;
alter table picks enable row level security;

-- Todos podem ler
create policy "read players" on players for select using (true);
create policy "read matches" on matches for select using (true);
create policy "read picks"   on picks   for select using (true);

-- Inserção/update abertos (app sem auth formal)
create policy "insert players" on players for insert with check (true);
create policy "insert matches" on matches for insert with check (true);
create policy "upsert matches" on matches for update using (true);
create policy "insert picks"   on picks   for insert with check (true);
create policy "update picks"   on picks   for update using (true);

-- ============================================================
-- Índices para performance
-- ============================================================
create index if not exists idx_picks_player on picks(player_id);
create index if not exists idx_picks_date   on picks(pick_date);
create index if not exists idx_picks_phase  on picks(phase);
create index if not exists idx_matches_date on matches(utc_date);
create index if not exists idx_matches_stage on matches(stage);

-- ============================================================
-- View útil: resumo de vidas por jogador
-- ============================================================
create or replace view player_lives as
select
  p.id,
  p.name,
  coalesce(sum(pk.lives_lost) filter (where pk.phase = 'groups'), 0)          as losses_groups,
  coalesce(sum(pk.lives_lost) filter (where pk.phase != 'groups'), 0)         as losses_knockout,
  case
    when exists (select 1 from picks pk2 where pk2.player_id = p.id and pk2.phase != 'groups')
    then greatest(0, 3 - coalesce(sum(pk.lives_lost) filter (where pk.phase != 'groups'), 0))
    else greatest(0, 6 - coalesce(sum(pk.lives_lost) filter (where pk.phase = 'groups'), 0))
  end as lives_remaining,
  case
    when greatest(0,
      case
        when exists (select 1 from picks pk2 where pk2.player_id = p.id and pk2.phase != 'groups')
        then 3 - coalesce(sum(pk.lives_lost) filter (where pk.phase != 'groups'), 0)
        else 6 - coalesce(sum(pk.lives_lost) filter (where pk.phase = 'groups'), 0)
      end
    ) = 0 then 'ELIMINADO'
    else 'VIVO'
  end as status
from players p
left join picks pk on pk.player_id = p.id and pk.result is not null
group by p.id, p.name;
