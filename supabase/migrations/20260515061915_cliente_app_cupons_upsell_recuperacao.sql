alter table public.agendamentos
  add column if not exists id_cupom_salao uuid null references public.cupons_salao(id) on delete set null,
  add column if not exists codigo_cupom text null,
  add column if not exists desconto_cupom_valor numeric(12,2) not null default 0 check (desconto_cupom_valor >= 0);

create index if not exists agendamentos_cupom_salao_idx
  on public.agendamentos (id_salao, id_cupom_salao, data desc)
  where id_cupom_salao is not null;

create table if not exists public.agendamento_adicionais (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  id_agendamento uuid not null references public.agendamentos(id) on delete cascade,
  id_servico uuid not null references public.servicos(id) on delete restrict,
  nome text not null,
  preco numeric(12,2) null,
  status text not null default 'sugerido'
    check (status in ('sugerido', 'aceito', 'recusado', 'convertido')),
  origem text not null default 'app_cliente_upsell',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint agendamento_adicionais_unico unique (id_agendamento, id_servico)
);

create index if not exists agendamento_adicionais_agendamento_idx
  on public.agendamento_adicionais (id_agendamento, status);

create index if not exists agendamento_adicionais_salao_idx
  on public.agendamento_adicionais (id_salao, created_at desc);

create table if not exists public.cupom_salao_usos (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  id_cupom uuid not null references public.cupons_salao(id) on delete cascade,
  id_cliente uuid null references public.clientes(id) on delete set null,
  cliente_app_conta_id uuid null references public.clientes_app_auth(id) on delete set null,
  id_agendamento uuid null references public.agendamentos(id) on delete set null,
  id_comanda uuid null references public.comandas(id) on delete set null,
  codigo text not null,
  valor_desconto numeric(12,2) not null default 0 check (valor_desconto >= 0),
  status text not null default 'reservado'
    check (status in ('reservado', 'aplicado', 'cancelado')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists cupom_salao_usos_cupom_idx
  on public.cupom_salao_usos (id_cupom, status, created_at desc);

create index if not exists cupom_salao_usos_cliente_idx
  on public.cupom_salao_usos (id_salao, id_cliente, codigo, created_at desc);

alter table public.agendamento_adicionais enable row level security;
alter table public.cupom_salao_usos enable row level security;

revoke all on table public.agendamento_adicionais from anon;
revoke all on table public.cupom_salao_usos from anon;

grant select, insert, update, delete on table public.agendamento_adicionais to service_role;
grant select, insert, update, delete on table public.cupom_salao_usos to service_role;
