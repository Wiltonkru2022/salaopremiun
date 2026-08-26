-- Production hardening pass:
-- - removes an obsolete billing helper that existed only in the remote database
-- - patches a stock function lint warning without rewriting the whole routine
-- - versions professional support chat tables
-- - enables tenant RLS on older salon tables still written directly by the UI

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure::text as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'fn_criar_cobranca_assinatura'
  loop
    execute format('drop function if exists %s cascade', fn.signature);
  end loop;
end
$$;

do $$
declare
  v_definition text;
  v_signature regprocedure;
begin
  v_signature := to_regprocedure('public.fn_processar_estoque_comanda_atomic(uuid, uuid, uuid)');

  if v_signature is not null then
    select pg_get_functiondef(v_signature)
      into v_definition;

    if position('perform v_comanda.id;' in v_definition) = 0 then
      v_definition := replace(
        v_definition,
        E'\n  for v_item in\n',
        E'\n  perform v_comanda.id;\n\n  for v_item in\n'
      );

      execute v_definition;
    end if;
  end if;
end
$$;

create table if not exists public.suporte_conversas (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  id_profissional uuid not null references public.profissionais(id) on delete cascade,
  origem_pagina text,
  id_comanda uuid references public.comandas(id) on delete set null,
  id_agendamento uuid,
  id_cliente uuid references public.clientes(id) on delete set null,
  titulo text not null default 'Suporte do app',
  atualizado_em timestamptz not null default now(),
  criado_em timestamptz not null default now()
);

alter table public.suporte_conversas
  add column if not exists id_salao uuid,
  add column if not exists id_profissional uuid,
  add column if not exists origem_pagina text,
  add column if not exists id_comanda uuid,
  add column if not exists id_agendamento uuid,
  add column if not exists id_cliente uuid,
  add column if not exists titulo text default 'Suporte do app',
  add column if not exists atualizado_em timestamptz default now(),
  add column if not exists criado_em timestamptz default now();

create index if not exists suporte_conversas_salao_profissional_idx
  on public.suporte_conversas (id_salao, id_profissional, atualizado_em desc);

create table if not exists public.suporte_mensagens (
  id uuid primary key default gen_random_uuid(),
  id_conversa uuid not null references public.suporte_conversas(id) on delete cascade,
  papel text not null,
  conteudo text not null,
  metadados jsonb,
  criado_em timestamptz not null default now()
);

alter table public.suporte_mensagens
  add column if not exists id_conversa uuid,
  add column if not exists papel text,
  add column if not exists conteudo text,
  add column if not exists metadados jsonb,
  add column if not exists criado_em timestamptz default now();

create index if not exists suporte_mensagens_conversa_criado_idx
  on public.suporte_mensagens (id_conversa, criado_em);

alter table public.suporte_conversas enable row level security;
alter table public.suporte_mensagens enable row level security;

revoke all on table public.suporte_conversas from anon, authenticated;
revoke all on table public.suporte_mensagens from anon, authenticated;

grant select, insert, update, delete on table public.suporte_conversas to service_role;
grant select, insert, update, delete on table public.suporte_mensagens to service_role;

do $$
declare
  tbl text;
  policy_select text;
  policy_insert text;
  policy_update text;
  policy_delete text;
begin
  foreach tbl in array array[
    'agendamentos',
    'agenda_bloqueios',
    'agenda_bloqueios_logs',
    'clientes',
    'profissionais',
    'servicos',
    'itens_extras',
    'produtos',
    'produto_servico_consumo',
    'profissional_servicos',
    'profissional_assistentes'
  ]
  loop
    if to_regclass(format('public.%I', tbl)) is not null
       and exists (
         select 1
         from information_schema.columns
         where table_schema = 'public'
           and table_name = tbl
           and column_name = 'id_salao'
       )
    then
      execute format('alter table public.%I enable row level security', tbl);
      execute format('revoke all on table public.%I from anon', tbl);
      execute format('grant select, insert, update, delete on table public.%I to authenticated, service_role', tbl);

      policy_select := tbl || '_select_membros_salao';
      policy_insert := tbl || '_insert_membros_salao';
      policy_update := tbl || '_update_membros_salao';
      policy_delete := tbl || '_delete_membros_salao';

      if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = tbl
          and policyname = policy_select
      ) then
        execute format(
          'create policy %I on public.%I for select to authenticated using (public.usuario_tem_acesso_salao(id_salao))',
          policy_select,
          tbl
        );
      end if;

      if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = tbl
          and policyname = policy_insert
      ) then
        execute format(
          'create policy %I on public.%I for insert to authenticated with check (public.usuario_tem_acesso_salao(id_salao))',
          policy_insert,
          tbl
        );
      end if;

      if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = tbl
          and policyname = policy_update
      ) then
        execute format(
          'create policy %I on public.%I for update to authenticated using (public.usuario_tem_acesso_salao(id_salao)) with check (public.usuario_tem_acesso_salao(id_salao))',
          policy_update,
          tbl
        );
      end if;

      if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = tbl
          and policyname = policy_delete
      ) then
        execute format(
          'create policy %I on public.%I for delete to authenticated using (public.usuario_tem_acesso_salao(id_salao))',
          policy_delete,
          tbl
        );
      end if;
    end if;
  end loop;
end
$$;
