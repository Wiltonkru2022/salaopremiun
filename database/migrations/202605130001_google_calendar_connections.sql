create table if not exists public.saloes_google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  google_email text,
  calendar_id text not null default 'primary',
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  ativo boolean not null default true,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id_salao)
);

create index if not exists idx_saloes_google_calendar_connections_salao
  on public.saloes_google_calendar_connections(id_salao)
  where ativo = true;

