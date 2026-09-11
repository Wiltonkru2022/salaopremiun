alter table public.agendamentos
  add column if not exists agendado_por_tipo text,
  add column if not exists agendado_por_id uuid,
  add column if not exists agendado_por_nome text,
  add column if not exists agendado_em timestamptz;

create table if not exists public.clientes_timeline (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null,
  id_cliente uuid not null,
  tipo text not null,
  titulo text not null,
  descricao text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_clientes_timeline_salao_cliente_created
  on public.clientes_timeline (id_salao, id_cliente, created_at desc);

create index if not exists idx_clientes_timeline_metadata_gin
  on public.clientes_timeline using gin (metadata);

alter table public.clientes_timeline enable row level security;

update public.agendamentos a
set
  origem = case
    when lower(coalesce(a.origem, '')) in ('app_profissional_vite', 'profissional_app', 'app-profissional') then 'app_profissional'
    when lower(coalesce(a.origem, '')) in ('app_cliente_vite', 'cliente_app', 'app-cliente') then 'app_cliente'
    else a.origem
  end,
  agendado_por_tipo = case
    when lower(coalesce(a.origem, '')) in ('app_profissional_vite', 'profissional_app', 'app-profissional', 'app_profissional') then coalesce(a.agendado_por_tipo, 'profissional')
    when lower(coalesce(a.origem, '')) in ('app_cliente_vite', 'cliente_app', 'app-cliente', 'app_cliente') then coalesce(a.agendado_por_tipo, 'cliente')
    else a.agendado_por_tipo
  end,
  agendado_por_nome = case
    when lower(coalesce(a.origem, '')) in ('app_profissional_vite', 'profissional_app', 'app-profissional', 'app_profissional') then coalesce(a.agendado_por_nome, p.nome_exibicao, p.nome)
    when lower(coalesce(a.origem, '')) in ('app_cliente_vite', 'cliente_app', 'app-cliente', 'app_cliente') then coalesce(a.agendado_por_nome, c.nome)
    else a.agendado_por_nome
  end,
  agendado_por_id = case
    when lower(coalesce(a.origem, '')) in ('app_profissional_vite', 'profissional_app', 'app-profissional', 'app_profissional') then coalesce(a.agendado_por_id, a.profissional_id)
    else a.agendado_por_id
  end,
  agendado_em = coalesce(a.agendado_em, a.created_at)
from public.profissionais p, public.clientes c
where p.id = a.profissional_id
  and c.id = a.cliente_id
  and (
    lower(coalesce(a.origem, '')) in ('app_profissional_vite', 'profissional_app', 'app-profissional', 'app_profissional', 'app_cliente_vite', 'cliente_app', 'app-cliente', 'app_cliente')
    or a.agendado_em is null
  );
