create table if not exists public.notificacoes_cliente_estado (
  id uuid primary key default gen_random_uuid(),
  id_notificacao uuid not null references public.notificacoes_globais(id) on delete cascade,
  cliente_app_conta_id uuid not null references public.clientes_app_auth(id) on delete cascade,
  exibida_em timestamptz,
  lida_em timestamptz,
  dispensada_em timestamptz,
  clicada_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id_notificacao, cliente_app_conta_id)
);

create index if not exists notificacoes_cliente_estado_conta_idx
  on public.notificacoes_cliente_estado (cliente_app_conta_id, atualizado_em desc);

create index if not exists notificacoes_cliente_estado_notificacao_idx
  on public.notificacoes_cliente_estado (id_notificacao, atualizado_em desc);

alter table public.notificacoes_cliente_estado enable row level security;
revoke all on table public.notificacoes_cliente_estado from anon, authenticated;
grant select, insert, update, delete on table public.notificacoes_cliente_estado to service_role;
