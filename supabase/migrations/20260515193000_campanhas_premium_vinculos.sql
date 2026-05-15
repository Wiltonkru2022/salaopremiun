alter table public.cupons_salao
  add column if not exists slug text null,
  add column if not exists status_campanha text not null default 'ativa'
    check (status_campanha in ('ativa', 'pausada', 'expirada', 'esgotada')),
  add column if not exists descricao_interna text null,
  add column if not exists mensagem_cliente text null,
  add column if not exists limite_uso_dia integer null check (limite_uso_dia is null or limite_uso_dia > 0),
  add column if not exists limite_por_telefone_email boolean not null default true,
  add column if not exists publico_tipo text not null default 'link'
    check (publico_tipo in ('link', 'clientes_especificos', 'novos_clientes')),
  add column if not exists visual_config jsonb not null default '{}'::jsonb;

create unique index if not exists cupons_salao_slug_uidx
  on public.cupons_salao (id_salao, slug)
  where slug is not null;

create index if not exists cupons_salao_status_slug_idx
  on public.cupons_salao (id_salao, status_campanha, slug);

create table if not exists public.cupom_salao_servicos (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  id_cupom uuid not null references public.cupons_salao(id) on delete cascade,
  id_servico uuid not null references public.servicos(id) on delete cascade,
  tipo_beneficio text not null default 'desconto_percentual'
    check (tipo_beneficio in ('desconto_percentual', 'desconto_valor', 'preco_fixo', 'brinde')),
  valor_beneficio numeric(12,2) null check (valor_beneficio is null or valor_beneficio >= 0),
  brinde_descricao text null,
  limite_uso_servico integer null check (limite_uso_servico is null or limite_uso_servico > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id_cupom, id_servico)
);

create index if not exists cupom_salao_servicos_cupom_idx
  on public.cupom_salao_servicos (id_salao, id_cupom);

create table if not exists public.cupom_salao_clientes (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  id_cupom uuid not null references public.cupons_salao(id) on delete cascade,
  id_cliente uuid not null references public.clientes(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (id_cupom, id_cliente)
);

create index if not exists cupom_salao_clientes_cupom_idx
  on public.cupom_salao_clientes (id_salao, id_cupom);

create table if not exists public.campanha_eventos (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  id_cupom uuid not null references public.cupons_salao(id) on delete cascade,
  cliente_app_conta_id uuid null references public.clientes_app_auth(id) on delete set null,
  id_cliente uuid null references public.clientes(id) on delete set null,
  tipo text not null check (tipo in ('clique', 'resgate', 'agendamento', 'cancelamento')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists campanha_eventos_cupom_idx
  on public.campanha_eventos (id_salao, id_cupom, tipo, created_at desc);

alter table public.cupom_salao_servicos enable row level security;
alter table public.cupom_salao_clientes enable row level security;
alter table public.campanha_eventos enable row level security;

revoke all on table public.cupom_salao_servicos from anon;
revoke all on table public.cupom_salao_clientes from anon;
revoke all on table public.campanha_eventos from anon;

grant select, insert, update, delete on table public.cupom_salao_servicos to service_role;
grant select, insert, update, delete on table public.cupom_salao_clientes to service_role;
grant select, insert, update, delete on table public.campanha_eventos to service_role;
