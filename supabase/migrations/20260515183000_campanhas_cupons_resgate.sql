alter table public.cupons_salao
  add column if not exists tipo_campanha text not null default 'manual'
    check (tipo_campanha in ('manual', 'inativos', 'aniversariantes', 'data_especial')),
  add column if not exists publico_alvo text not null default 'manual'
    check (publico_alvo in ('manual', 'inativos_30', 'inativos_45', 'inativos_60', 'aniversariantes_mes', 'data_especial')),
  add column if not exists titulo_push text null,
  add column if not exists mensagem_push text null,
  add column if not exists resgate_token text null,
  add column if not exists requer_resgate boolean not null default true,
  add column if not exists push_delay_minutos integer not null default 5 check (push_delay_minutos >= 0),
  add column if not exists criado_por_painel uuid null,
  add column if not exists origem text not null default 'painel';

create unique index if not exists cupons_salao_resgate_token_uidx
  on public.cupons_salao (resgate_token)
  where resgate_token is not null;

create index if not exists cupons_salao_campanhas_idx
  on public.cupons_salao (id_salao, tipo_campanha, ativo, created_at desc);

update public.cupons_salao
set requer_resgate = true
where automatico_recuperacao = true;

create table if not exists public.cupom_salao_resgates (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  id_cupom uuid not null references public.cupons_salao(id) on delete cascade,
  cliente_app_conta_id uuid null references public.clientes_app_auth(id) on delete cascade,
  id_cliente uuid null references public.clientes(id) on delete set null,
  token text not null,
  status text not null default 'resgatado'
    check (status in ('resgatado', 'usado', 'cancelado', 'expirado')),
  resgatado_em timestamptz not null default timezone('utc', now()),
  usado_em timestamptz null,
  notificado_em timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists cupom_salao_resgates_unico_uidx
  on public.cupom_salao_resgates (id_cupom, cliente_app_conta_id)
  where cliente_app_conta_id is not null;

create index if not exists cupom_salao_resgates_cliente_idx
  on public.cupom_salao_resgates (id_salao, cliente_app_conta_id, status, created_at desc);

alter table public.cupom_salao_resgates enable row level security;
revoke all on table public.cupom_salao_resgates from anon;
grant select, insert, update, delete on table public.cupom_salao_resgates to service_role;
