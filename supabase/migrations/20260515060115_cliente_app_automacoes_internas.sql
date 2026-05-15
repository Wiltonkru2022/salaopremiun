alter table public.agendamentos
  add column if not exists cliente_confirmacao_status text not null default 'aguardando'
    check (cliente_confirmacao_status in ('aguardando', 'confirmado', 'cancelado')),
  add column if not exists cliente_confirmou_em timestamptz null,
  add column if not exists cliente_cancelou_em timestamptz null;

create index if not exists agendamentos_cliente_confirmacao_idx
  on public.agendamentos (id_salao, cliente_confirmacao_status, data, hora_inicio)
  where status <> 'cancelado';

create table if not exists public.lista_espera_agendamentos (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  cliente_app_conta_id uuid null references public.clientes_app_auth(id) on delete cascade,
  id_cliente uuid null references public.clientes(id) on delete set null,
  id_servico uuid null references public.servicos(id) on delete set null,
  id_profissional uuid null references public.profissionais(id) on delete set null,
  data_preferida date null,
  hora_inicio_preferida time null,
  hora_fim_preferida time null,
  status text not null default 'ativo'
    check (status in ('ativo', 'avisado', 'convertido', 'cancelado', 'expirado')),
  origem text not null default 'app_cliente',
  observacoes text null,
  ultimo_aviso_em timestamptz null,
  expires_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists lista_espera_salao_status_idx
  on public.lista_espera_agendamentos (id_salao, status, created_at desc);

create index if not exists lista_espera_match_idx
  on public.lista_espera_agendamentos (
    id_salao,
    id_servico,
    id_profissional,
    data_preferida,
    status,
    created_at
  )
  where status = 'ativo';

create table if not exists public.cupons_salao (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  codigo text not null,
  nome text not null,
  descricao text null,
  tipo_desconto text not null default 'percentual'
    check (tipo_desconto in ('percentual', 'valor_fixo')),
  valor_desconto numeric(12,2) not null default 0 check (valor_desconto >= 0),
  valor_minimo numeric(12,2) null check (valor_minimo is null or valor_minimo >= 0),
  limite_uso_total integer null check (limite_uso_total is null or limite_uso_total > 0),
  limite_uso_cliente integer null check (limite_uso_cliente is null or limite_uso_cliente > 0),
  dias_cliente_inativo integer null check (dias_cliente_inativo is null or dias_cliente_inativo > 0),
  valido_de date null,
  valido_ate date null,
  ativo boolean not null default true,
  automatico_recuperacao boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint cupons_salao_codigo_uidx unique (id_salao, codigo)
);

create index if not exists cupons_salao_recuperacao_idx
  on public.cupons_salao (id_salao, automatico_recuperacao, ativo, dias_cliente_inativo)
  where automatico_recuperacao = true;

create table if not exists public.cliente_campanhas_recuperacao (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  id_cliente uuid not null references public.clientes(id) on delete cascade,
  cliente_app_conta_id uuid null references public.clientes_app_auth(id) on delete cascade,
  id_cupom uuid null references public.cupons_salao(id) on delete set null,
  dias_inativo integer not null check (dias_inativo > 0),
  status text not null default 'pendente'
    check (status in ('pendente', 'enviada', 'convertida', 'cancelada', 'ignorada')),
  enviada_em timestamptz null,
  convertida_em timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists cliente_campanhas_recuperacao_unica_uidx
  on public.cliente_campanhas_recuperacao (id_salao, id_cliente, dias_inativo)
  where status in ('pendente', 'enviada');

create index if not exists cliente_campanhas_recuperacao_salao_status_idx
  on public.cliente_campanhas_recuperacao (id_salao, status, created_at desc);

alter table public.lista_espera_agendamentos enable row level security;
alter table public.cupons_salao enable row level security;
alter table public.cliente_campanhas_recuperacao enable row level security;

revoke all on table public.lista_espera_agendamentos from anon;
revoke all on table public.cupons_salao from anon;
revoke all on table public.cliente_campanhas_recuperacao from anon;

grant select, insert, update, delete on table public.lista_espera_agendamentos to service_role;
grant select, insert, update, delete on table public.cupons_salao to service_role;
grant select, insert, update, delete on table public.cliente_campanhas_recuperacao to service_role;
