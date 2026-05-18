-- ============================================================
-- ADIÇÕES — rode isso no SQL Editor do Supabase
-- ============================================================

-- Adiciona avatar e senha aos jogadores
alter table players add column if not exists avatar text default '⚽';
alter table players add column if not exists password_hash text;

-- Chat global
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade not null,
  player_name text not null,
  player_avatar text default '⚽',
  content text not null,
  created_at timestamptz default now()
);

alter table messages enable row level security;
create policy "read messages"   on messages for select using (true);
create policy "insert messages" on messages for insert with check (true);

-- Habilita realtime para o chat
alter publication supabase_realtime add table messages;

-- Policy de update para avatar/senha do jogador
create policy "update player" on players for update using (true);
