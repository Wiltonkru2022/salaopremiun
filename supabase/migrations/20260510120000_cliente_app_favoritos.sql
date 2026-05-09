create table if not exists public.clientes_app_favoritos (
  id uuid primary key default gen_random_uuid(),
  cliente_app_conta_id uuid not null references public.clientes_app_auth(id) on delete cascade,
  id_salao uuid not null references public.saloes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (cliente_app_conta_id, id_salao)
);

create index if not exists clientes_app_favoritos_conta_created_idx
  on public.clientes_app_favoritos (cliente_app_conta_id, created_at desc);

create index if not exists clientes_app_favoritos_salao_idx
  on public.clientes_app_favoritos (id_salao);

alter table public.clientes_app_favoritos enable row level security;
