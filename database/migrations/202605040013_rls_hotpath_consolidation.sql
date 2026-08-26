begin;

create or replace function public.fn_auth_user_id()
returns uuid
language sql
stable
as $$
  select (select auth.uid());
$$;

create or replace function public.fn_usuario_atual()
returns public.usuarios
language sql
stable
security definer
set search_path = public
as $$
  select u.*
  from public.usuarios u
  where u.auth_user_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.fn_id_salao_atual()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id_salao
  from public.usuarios u
  where u.auth_user_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.fn_usuario_ativo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.auth_user_id = (select auth.uid())
      and u.status = 'ativo'
  );
$$;

create or replace function public.fn_usuario_nivel()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.nivel
  from public.usuarios u
  where u.auth_user_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.fn_usuario_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.auth_user_id = (select auth.uid())
      and u.status = 'ativo'
      and u.nivel = 'admin'
  );
$$;

create or replace function public.fn_usuario_mesmo_salao(target_id_salao uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.auth_user_id = (select auth.uid())
      and u.status = 'ativo'
      and u.id_salao = target_id_salao
  );
$$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'usuarios',
    'saloes',
    'clientes',
    'profissionais',
    'agendamentos',
    'comandas',
    'produtos',
    'assinaturas',
    'tickets'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', tbl || '_select_membros_salao', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_insert_membros_salao', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_update_membros_salao', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_delete_membros_salao', tbl);
  end loop;
end
$$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'agenda_bloqueios',
    'clientes_preferencias',
    'clientes_autorizacoes',
    'clientes_auth',
    'clientes_historico',
    'configuracoes_salao',
    'produtos_alertas',
    'recursos_agenda'
  ]
  loop
    if to_regclass(format('public.%I', tbl)) is null then
      continue;
    end if;

    if exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = tbl
        and policyname = tbl || '_select_membros_salao'
    ) then
      execute format('drop policy if exists %I on public.%I', tbl || '_select_membros_salao', tbl);
      execute format(
        'create policy %I on public.%I for select to authenticated using ((select public.usuario_tem_acesso_salao(id_salao)))',
        tbl || '_select_membros_salao',
        tbl
      );
    end if;

    if exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = tbl
        and policyname = tbl || '_insert_membros_salao'
    ) then
      execute format('drop policy if exists %I on public.%I', tbl || '_insert_membros_salao', tbl);
      execute format(
        'create policy %I on public.%I for insert to authenticated with check ((select public.usuario_tem_acesso_salao(id_salao)))',
        tbl || '_insert_membros_salao',
        tbl
      );
    end if;

    if exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = tbl
        and policyname = tbl || '_update_membros_salao'
    ) then
      execute format('drop policy if exists %I on public.%I', tbl || '_update_membros_salao', tbl);
      execute format(
        'create policy %I on public.%I for update to authenticated using ((select public.usuario_tem_acesso_salao(id_salao))) with check ((select public.usuario_tem_acesso_salao(id_salao)))',
        tbl || '_update_membros_salao',
        tbl
      );
    end if;

    if exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = tbl
        and policyname = tbl || '_delete_membros_salao'
    ) then
      execute format('drop policy if exists %I on public.%I', tbl || '_delete_membros_salao', tbl);
      execute format(
        'create policy %I on public.%I for delete to authenticated using ((select public.usuario_tem_acesso_salao(id_salao)))',
        tbl || '_delete_membros_salao',
        tbl
      );
    end if;
  end loop;
end
$$;

do $$
begin
  if to_regclass('public.produtos_movimentacoes') is not null then
    if exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'produtos_movimentacoes'
        and policyname = 'produtos_movimentacoes_select_membros_salao'
    ) then
      drop policy if exists "produtos_movimentacoes_select_membros_salao" on public.produtos_movimentacoes;
      create policy "produtos_movimentacoes_select_membros_salao"
        on public.produtos_movimentacoes
        for select
        to authenticated
        using ((select public.usuario_tem_acesso_salao(id_salao)));
    end if;

    if exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'produtos_movimentacoes'
        and policyname = 'produtos_movimentacoes_insert_operadores_salao'
    ) then
      drop policy if exists "produtos_movimentacoes_insert_operadores_salao" on public.produtos_movimentacoes;
      create policy "produtos_movimentacoes_insert_operadores_salao"
        on public.produtos_movimentacoes
        for insert
        to authenticated
        with check ((select public.usuario_pode_operar_caixa(id_salao)));
    end if;

    if exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'produtos_movimentacoes'
        and policyname = 'produtos_movimentacoes_update_operadores_salao'
    ) then
      drop policy if exists "produtos_movimentacoes_update_operadores_salao" on public.produtos_movimentacoes;
      create policy "produtos_movimentacoes_update_operadores_salao"
        on public.produtos_movimentacoes
        for update
        to authenticated
        using ((select public.usuario_pode_operar_caixa(id_salao)))
        with check ((select public.usuario_pode_operar_caixa(id_salao)));
    end if;

    if exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'produtos_movimentacoes'
        and policyname = 'produtos_movimentacoes_delete_operadores_salao'
    ) then
      drop policy if exists "produtos_movimentacoes_delete_operadores_salao" on public.produtos_movimentacoes;
      create policy "produtos_movimentacoes_delete_operadores_salao"
        on public.produtos_movimentacoes
        for delete
        to authenticated
        using ((select public.usuario_pode_operar_caixa(id_salao)));
    end if;
  end if;
end
$$;

commit;
