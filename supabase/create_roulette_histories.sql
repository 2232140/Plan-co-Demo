create table if not exists roulette_histories (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  type        text not null check (type in ('ai', 'custom')),
  conditions  jsonb not null default '{}',
  options     jsonb not null default '[]',
  selected_option text not null
);

-- Index for listing newest first
create index if not exists roulette_histories_created_at_idx
  on roulette_histories (created_at desc);
