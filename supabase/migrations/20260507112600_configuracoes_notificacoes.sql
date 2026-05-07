create table if not exists public.configuracoes_notificacoes (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  cliente_agendamento_confirmado boolean not null default true,
  cliente_lembrete_30min boolean not null default true,
  cliente_atendimento_finalizado boolean not null default true,
  cliente_avaliar_atendimento boolean not null default true,
  cliente_reagendamento boolean not null default true,
  cliente_cancelamento boolean not null default true,
  profissional_lembrete_30min boolean not null default true,
  profissional_atendimento_finalizado boolean not null default true,
  profissional_reagendamento boolean not null default true,
  profissional_cancelamento boolean not null default true,
  salao_novo_agendamento_app boolean not null default true,
  salao_cancelamento_cliente boolean not null default true,
  salao_reagendamento_cliente boolean not null default true,
  salao_avaliacoes boolean not null default true,
  lembrete_minutos_antes integer not null default 30 check (lembrete_minutos_antes between 5 and 240),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists configuracoes_notificacoes_salao_uidx
  on public.configuracoes_notificacoes (id_salao);

alter table public.configuracoes_notificacoes enable row level security;

drop policy if exists configuracoes_notificacoes_select_mesmo_salao on public.configuracoes_notificacoes;
create policy configuracoes_notificacoes_select_mesmo_salao
on public.configuracoes_notificacoes
for select
to authenticated
using (
  exists (
    select 1
    from public.usuarios u
    where u.auth_user_id = auth.uid()
      and u.id_salao = configuracoes_notificacoes.id_salao
      and u.status = 'ativo'
  )
);

drop policy if exists configuracoes_notificacoes_insert_mesmo_salao on public.configuracoes_notificacoes;
create policy configuracoes_notificacoes_insert_mesmo_salao
on public.configuracoes_notificacoes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.usuarios u
    where u.auth_user_id = auth.uid()
      and u.id_salao = configuracoes_notificacoes.id_salao
      and u.status = 'ativo'
  )
);

drop policy if exists configuracoes_notificacoes_update_mesmo_salao on public.configuracoes_notificacoes;
create policy configuracoes_notificacoes_update_mesmo_salao
on public.configuracoes_notificacoes
for update
to authenticated
using (
  exists (
    select 1
    from public.usuarios u
    where u.auth_user_id = auth.uid()
      and u.id_salao = configuracoes_notificacoes.id_salao
      and u.status = 'ativo'
  )
)
with check (
  exists (
    select 1
    from public.usuarios u
    where u.auth_user_id = auth.uid()
      and u.id_salao = configuracoes_notificacoes.id_salao
      and u.status = 'ativo'
  )
);
