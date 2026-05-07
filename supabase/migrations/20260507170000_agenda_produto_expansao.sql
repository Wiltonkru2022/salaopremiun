alter table if exists public.servicos
  add column if not exists permite_agendamento_grupo boolean not null default false,
  add column if not exists capacidade_por_horario integer not null default 1,
  add column if not exists exigir_sinal_app_cliente boolean not null default false,
  add column if not exists sinal_tipo text not null default 'percentual',
  add column if not exists sinal_valor numeric(10, 2) not null default 0;

alter table if exists public.agendamentos
  add column if not exists recorrencia_grupo_id uuid,
  add column if not exists recorrencia_regra jsonb,
  add column if not exists capacidade_total integer not null default 1,
  add column if not exists vagas_ocupadas integer not null default 1,
  add column if not exists sinal_status text not null default 'nao_exigido',
  add column if not exists sinal_valor numeric(10, 2) not null default 0,
  add column if not exists sinal_expira_em timestamptz,
  add column if not exists google_calendar_event_id text,
  add column if not exists google_calendar_sync_status text not null default 'pendente',
  add column if not exists google_calendar_synced_at timestamptz;

alter table if exists public.agenda_bloqueios
  add column if not exists tipo text not null default 'manual',
  add column if not exists dia_inteiro boolean not null default false,
  add column if not exists data_fim date,
  add column if not exists recorrente boolean not null default false,
  add column if not exists recorrencia_regra jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'servicos_capacidade_por_horario_check'
  ) then
    alter table public.servicos
      add constraint servicos_capacidade_por_horario_check
      check (capacidade_por_horario >= 1);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'servicos_sinal_tipo_check'
  ) then
    alter table public.servicos
      add constraint servicos_sinal_tipo_check
      check (sinal_tipo in ('percentual', 'valor_fixo'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'servicos_sinal_valor_check'
  ) then
    alter table public.servicos
      add constraint servicos_sinal_valor_check
      check (sinal_valor >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'agendamentos_capacidade_total_check'
  ) then
    alter table public.agendamentos
      add constraint agendamentos_capacidade_total_check
      check (capacidade_total >= 1);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'agendamentos_vagas_ocupadas_check'
  ) then
    alter table public.agendamentos
      add constraint agendamentos_vagas_ocupadas_check
      check (vagas_ocupadas >= 0 and vagas_ocupadas <= capacidade_total);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'agendamentos_sinal_status_check'
  ) then
    alter table public.agendamentos
      add constraint agendamentos_sinal_status_check
      check (sinal_status in ('nao_exigido', 'pendente', 'pago', 'expirado', 'dispensado'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'agendamentos_google_calendar_sync_status_check'
  ) then
    alter table public.agendamentos
      add constraint agendamentos_google_calendar_sync_status_check
      check (google_calendar_sync_status in ('pendente', 'sincronizado', 'erro', 'desativado'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'agenda_bloqueios_tipo_check'
  ) then
    alter table public.agenda_bloqueios
      add constraint agenda_bloqueios_tipo_check
      check (tipo in ('manual', 'feriado', 'pausa', 'ferias', 'almoco', 'excecao'));
  end if;
end $$;

create table if not exists public.clientes_timeline (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  id_cliente uuid not null references public.clientes(id) on delete cascade,
  tipo text not null default 'nota',
  titulo text not null,
  descricao text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.salao_roadmap_items (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  categoria text not null default 'produto',
  status text not null default 'planejado',
  eta_label text,
  votos integer not null default 0,
  visivel boolean not null default true,
  ordem integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clientes_timeline_tipo_check'
  ) then
    alter table public.clientes_timeline
      add constraint clientes_timeline_tipo_check
      check (tipo in ('nota', 'agendamento', 'pagamento', 'avaliacao', 'contato', 'sistema'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'salao_roadmap_items_status_check'
  ) then
    alter table public.salao_roadmap_items
      add constraint salao_roadmap_items_status_check
      check (status in ('planejado', 'em_implementacao', 'entregue'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'salao_roadmap_items_votos_check'
  ) then
    alter table public.salao_roadmap_items
      add constraint salao_roadmap_items_votos_check
      check (votos >= 0);
  end if;
end $$;

create index if not exists idx_agendamentos_recorrencia_grupo
  on public.agendamentos(recorrencia_grupo_id)
  where recorrencia_grupo_id is not null;

create index if not exists idx_agendamentos_google_calendar_event
  on public.agendamentos(google_calendar_event_id)
  where google_calendar_event_id is not null;

create index if not exists idx_clientes_timeline_cliente_created
  on public.clientes_timeline(id_salao, id_cliente, created_at desc);

create index if not exists idx_salao_roadmap_items_status_ordem
  on public.salao_roadmap_items(status, ordem)
  where visivel = true;

alter table public.clientes_timeline enable row level security;
alter table public.salao_roadmap_items enable row level security;

grant select, insert, update, delete on public.clientes_timeline to authenticated, service_role;
grant select on public.salao_roadmap_items to authenticated, service_role;
grant insert, update, delete on public.salao_roadmap_items to service_role;

drop policy if exists clientes_timeline_select_membros on public.clientes_timeline;
drop policy if exists clientes_timeline_insert_membros on public.clientes_timeline;
drop policy if exists clientes_timeline_update_membros on public.clientes_timeline;
drop policy if exists clientes_timeline_delete_membros on public.clientes_timeline;

create policy clientes_timeline_select_membros
on public.clientes_timeline
for select
to authenticated
using (public.usuario_tem_acesso_salao(id_salao));

create policy clientes_timeline_insert_membros
on public.clientes_timeline
for insert
to authenticated
with check (public.usuario_tem_acesso_salao(id_salao));

create policy clientes_timeline_update_membros
on public.clientes_timeline
for update
to authenticated
using (public.usuario_tem_acesso_salao(id_salao))
with check (public.usuario_tem_acesso_salao(id_salao));

create policy clientes_timeline_delete_membros
on public.clientes_timeline
for delete
to authenticated
using (public.usuario_tem_acesso_salao(id_salao));

drop policy if exists salao_roadmap_items_select_visiveis on public.salao_roadmap_items;

create policy salao_roadmap_items_select_visiveis
on public.salao_roadmap_items
for select
to authenticated
using (visivel = true);

insert into public.salao_roadmap_items (titulo, descricao, categoria, status, eta_label, votos, ordem)
select seed.titulo, seed.descricao, seed.categoria, seed.status, seed.eta_label, seed.votos, seed.ordem
from (values
  ('NFS-e', 'Emissao fiscal integrada ao fluxo do salao, preparada para operar com seguranca e rastreabilidade.', 'financeiro', 'em_implementacao', 'Em implementacao', 0, 10),
  ('WhatsApp automatico', 'Mensagens automaticas para confirmacao, lembretes e relacionamento com clientes.', 'comunicacao', 'em_implementacao', 'Em implementacao', 0, 20),
  ('Cobranca de sinal', 'Configuracao de entrada por servico para reduzir faltas e proteger horarios importantes.', 'agenda', 'em_implementacao', 'Proxima etapa', 0, 30),
  ('Google Calendar', 'Sincronizacao dos horarios confirmados com a agenda externa do profissional.', 'agenda', 'planejado', 'Planejado', 0, 40),
  ('Agendamento em grupo', 'Controle de capacidade por horario para aulas, pacotes e atendimentos coletivos.', 'agenda', 'planejado', 'Planejado', 0, 50),
  ('Recorrencia', 'Criacao de repeticoes semanais ou mensais para clientes fixos e planos recorrentes.', 'agenda', 'planejado', 'Planejado', 0, 60),
  ('Linha do tempo do cliente', 'Historico unificado com agenda, observacoes, pagamentos, avaliacoes e contatos.', 'clientes', 'planejado', 'Planejado', 0, 70),
  ('Link publico direto', 'Link curto e divulgavel para abrir o perfil publico do salao no app cliente.', 'app_cliente', 'entregue', 'Disponivel', 0, 80),
  ('Bloqueios da agenda', 'Base para bloqueios por pausa, ferias, feriados, dia inteiro e repeticoes.', 'agenda', 'entregue', 'Base pronta', 0, 90)
) as seed(titulo, descricao, categoria, status, eta_label, votos, ordem)
where not exists (
  select 1
  from public.salao_roadmap_items item
  where item.titulo = seed.titulo
);
