create extension if not exists pgcrypto;

create table if not exists public.caixa_sessoes (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null,
  id_usuario_abertura uuid,
  id_usuario_fechamento uuid,
  status text not null default 'aberto' check (status in ('aberto', 'fechado')),
  valor_abertura numeric(12, 2) not null default 0,
  valor_fechamento_informado numeric(12, 2),
  observacoes text,
  aberto_em timestamptz not null default now(),
  fechado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists caixa_sessoes_um_aberto_por_salao
  on public.caixa_sessoes (id_salao)
  where status = 'aberto';

create index if not exists caixa_sessoes_salao_status_idx
  on public.caixa_sessoes (id_salao, status, aberto_em desc);

create table if not exists public.caixa_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null,
  id_sessao uuid not null references public.caixa_sessoes(id) on delete cascade,
  id_usuario uuid,
  id_comanda uuid,
  id_profissional uuid,
  tipo text not null check (tipo in ('sangria', 'suprimento', 'venda', 'vale_profissional', 'ajuste')),
  forma_pagamento text,
  valor numeric(12, 2) not null check (valor > 0),
  descricao text,
  created_at timestamptz not null default now()
);

create index if not exists caixa_movimentacoes_sessao_idx
  on public.caixa_movimentacoes (id_sessao, created_at desc);

create index if not exists caixa_movimentacoes_salao_tipo_idx
  on public.caixa_movimentacoes (id_salao, tipo, created_at desc);

create table if not exists public.profissionais_vales (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null,
  id_profissional uuid not null,
  id_usuario uuid,
  id_sessao uuid references public.caixa_sessoes(id) on delete set null,
  id_movimentacao uuid references public.caixa_movimentacoes(id) on delete set null,
  id_comissao_lancamento uuid,
  valor numeric(12, 2) not null check (valor > 0),
  descricao text,
  status text not null default 'aberto' check (status in ('aberto', 'descontado', 'cancelado')),
  lancado_em timestamptz not null default now(),
  descontado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profissionais_vales_salao_status_idx
  on public.profissionais_vales (id_salao, status, lancado_em desc);

create index if not exists profissionais_vales_profissional_status_idx
  on public.profissionais_vales (id_profissional, status, lancado_em desc);
