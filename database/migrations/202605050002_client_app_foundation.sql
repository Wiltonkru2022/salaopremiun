alter table public.saloes
  add column if not exists descricao_publica text,
  add column if not exists foto_capa_url text,
  add column if not exists latitude numeric(10,7),
  add column if not exists longitude numeric(10,7),
  add column if not exists estacionamento boolean not null default false,
  add column if not exists formas_pagamento_publico jsonb not null default '[]'::jsonb,
  add column if not exists app_cliente_publicado boolean not null default false;

alter table public.profissionais
  add column if not exists especialidade_publica text,
  add column if not exists bio_publica text,
  add column if not exists app_cliente_visivel boolean not null default true;

alter table public.servicos
  add column if not exists descricao_publica text,
  add column if not exists app_cliente_visivel boolean not null default true;

create table if not exists public.clientes_avaliacoes (
  id uuid primary key default gen_random_uuid(),
  id_cliente uuid not null references public.clientes(id) on delete cascade,
  id_salao uuid not null references public.saloes(id) on delete cascade,
  id_agendamento uuid null references public.agendamentos(id) on delete set null,
  nota integer not null check (nota between 1 and 5),
  comentario text null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists clientes_avaliacoes_cliente_agendamento_uidx
  on public.clientes_avaliacoes (id_cliente, id_agendamento)
  where id_agendamento is not null;

create index if not exists clientes_avaliacoes_salao_created_idx
  on public.clientes_avaliacoes (id_salao, created_at desc);

create index if not exists clientes_avaliacoes_cliente_created_idx
  on public.clientes_avaliacoes (id_cliente, created_at desc);

create index if not exists saloes_app_cliente_publicados_idx
  on public.saloes (status, app_cliente_publicado, cidade, bairro)
  where app_cliente_publicado = true;

create index if not exists assinaturas_app_cliente_elegibilidade_idx
  on public.assinaturas (id_salao, status, plano);

create unique index if not exists clientes_auth_salao_email_uidx
  on public.clientes_auth (id_salao, lower(email))
  where email is not null;

create index if not exists clientes_auth_email_login_idx
  on public.clientes_auth (lower(email), app_ativo, id_salao)
  where email is not null and app_ativo = true;
