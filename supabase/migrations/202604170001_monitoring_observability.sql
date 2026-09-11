create extension if not exists pgcrypto;

create table if not exists public.eventos_sistema (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid references public.saloes(id) on delete set null,
  id_usuario uuid references public.usuarios(id) on delete set null,
  id_admin_usuario uuid references public.admin_master_usuarios(id) on delete set null,
  modulo text not null default 'sistema',
  tipo_evento text not null,
  severidade text not null default 'info',
  mensagem text not null,
  detalhes_json jsonb not null default '{}'::jsonb,
  origem text not null default 'server',
  superficie text,
  rota text,
  tela text,
  acao text,
  entidade text,
  entidade_id text,
  browser text,
  device text,
  response_ms integer,
  sucesso boolean,
  eh_erro_usuario boolean not null default false,
  codigo_erro text,
  stack_resumida text,
  created_at timestamptz not null default now()
);

create index if not exists eventos_sistema_created_at_idx
  on public.eventos_sistema (created_at desc);

create index if not exists eventos_sistema_modulo_idx
  on public.eventos_sistema (modulo, created_at desc);

create index if not exists eventos_sistema_salao_idx
  on public.eventos_sistema (id_salao, created_at desc);

create index if not exists eventos_sistema_severidade_idx
  on public.eventos_sistema (severidade, created_at desc);

create index if not exists eventos_sistema_tipo_idx
  on public.eventos_sistema (tipo_evento, created_at desc);

create table if not exists public.incidentes_sistema (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  titulo text not null,
  modulo text not null,
  severidade text not null default 'media',
  status text not null default 'aberto',
  regra_origem text,
  impacto_saloes integer not null default 0,
  total_ocorrencias integer not null default 1,
  primeira_ocorrencia_em timestamptz not null default now(),
  ultima_ocorrencia_em timestamptz not null default now(),
  acao_sugerida text,
  resolucao_automatica_disponivel boolean not null default false,
  referencia_json jsonb not null default '{}'::jsonb,
  resolvido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists incidentes_sistema_status_idx
  on public.incidentes_sistema (status, severidade, ultima_ocorrencia_em desc);

create index if not exists incidentes_sistema_modulo_idx
  on public.incidentes_sistema (modulo, ultima_ocorrencia_em desc);

create table if not exists public.health_checks_sistema (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  nome text not null,
  status text not null default 'ok',
  score integer not null default 100,
  detalhes_json jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

create index if not exists health_checks_sistema_status_idx
  on public.health_checks_sistema (status, atualizado_em desc);

create table if not exists public.acoes_automaticas_sistema (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  referencia text,
  executada boolean not null default false,
  sucesso boolean not null default false,
  log text,
  detalhes_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  executada_em timestamptz
);

create index if not exists acoes_automaticas_sistema_created_at_idx
  on public.acoes_automaticas_sistema (created_at desc);

create index if not exists acoes_automaticas_sistema_tipo_idx
  on public.acoes_automaticas_sistema (tipo, created_at desc);

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'eventos_sistema',
    'incidentes_sistema',
    'health_checks_sistema',
    'acoes_automaticas_sistema'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('revoke all on table public.%I from anon, authenticated', tbl);
  end loop;
end
$$;
