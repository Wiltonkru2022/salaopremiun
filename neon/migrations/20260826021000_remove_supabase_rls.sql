-- Remove Supabase auth/RLS compatibility from the Neon schema.
-- Application identity is injected per transaction with app.user_id,
-- app.user_email and app.aal by lib/neon/database.server.ts.

create schema if not exists private;

create or replace function private.current_user_id()
returns uuid language sql stable
as $$ select nullif(current_setting('app.user_id', true), '')::uuid $$;

create or replace function private.current_user_email()
returns text language sql stable
as $$ select nullif(current_setting('app.user_email', true), '') $$;

create or replace function private.current_aal()
returns text language sql stable
as $$ select coalesce(nullif(current_setting('app.aal', true), ''), 'aal1') $$;

create or replace function private.fn_usuario_admin()
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.usuarios u
    where u.id = private.current_user_id()
      and u.status = 'ativo'
      and u.nivel = 'admin'
  )
$$;

create or replace function private.fn_id_salao_atual()
returns uuid language sql stable security definer set search_path=public
as $$
  select u.id_salao from public.usuarios u
  where u.id = private.current_user_id()
  limit 1
$$;

create or replace function private.fn_usuario_ativo()
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.usuarios u
    where u.id = private.current_user_id() and u.status = 'ativo'
  )
$$;

create or replace function private.fn_usuario_nivel()
returns text language sql stable security definer set search_path=public
as $$
  select u.nivel from public.usuarios u
  where u.id = private.current_user_id()
  limit 1
$$;

create or replace function private.fn_usuario_mesmo_salao(target_id_salao uuid)
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.usuarios u
    where u.id = private.current_user_id()
      and u.status = 'ativo'
      and u.id_salao = target_id_salao
  )
$$;

create or replace function private.fn_usuario_pertence_ao_salao(p_id_salao uuid)
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.usuarios u
    where u.id = private.current_user_id()
      and u.id_salao = p_id_salao
      and coalesce(u.status, 'ativo') = 'ativo'
  )
$$;

create or replace function private.usuario_tem_acesso_salao(p_id_salao uuid)
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.usuarios u
    where u.id = private.current_user_id()
      and u.id_salao = p_id_salao
      and coalesce(u.status, 'ativo') = 'ativo'
  )
$$;

create or replace function private.profissional_usuario_admin_mesmo_salao(target_id_profissional uuid)
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(
    select 1
    from public.profissionais p
    join public.usuarios u on u.id_salao = p.id_salao
    where p.id = target_id_profissional
      and u.id = private.current_user_id()
      and coalesce(u.status, 'ativo') = 'ativo'
      and lower(coalesce(u.nivel, '')) in ('admin', 'gerente')
  )
$$;

create or replace function private.profissional_usuario_mesmo_salao(target_id_profissional uuid)
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(
    select 1
    from public.profissionais p
    join public.usuarios u on u.id_salao = p.id_salao
    where p.id = target_id_profissional
      and u.id = private.current_user_id()
      and coalesce(u.status, 'ativo') = 'ativo'
  )
$$;

create or replace function private.usuario_pode_operar_caixa(p_id_salao uuid)
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.usuarios u
    where u.id = private.current_user_id()
      and u.id_salao = p_id_salao
      and coalesce(u.status, 'ativo') = 'ativo'
      and lower(coalesce(u.nivel, '')) in ('admin', 'gerente')
  )
$$;

create or replace function private.usuario_pode_ver_suporte(p_id_salao uuid)
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.usuarios u
    where u.id = private.current_user_id()
      and u.id_salao = p_id_salao
      and lower(coalesce(u.status, '')) = 'ativo'
      and lower(coalesce(u.nivel, '')) in ('admin','gerente','profissional','recepcao')
  )
$$;

create or replace function private.fn_usuario_tem_permissao(p_permissao text)
returns boolean language plpgsql stable security definer set search_path=public
as $$
declare
  v_nivel text;
  v_override boolean;
  v_default boolean := false;
begin
  select lower(coalesce(u.nivel, '')),
         case
           when up.id is null then null
           when to_jsonb(up) ? p_permissao then (to_jsonb(up) ->> p_permissao)::boolean
           else null
         end
    into v_nivel, v_override
  from public.usuarios u
  left join public.usuarios_permissoes up
    on up.id_usuario = u.id and up.id_salao = u.id_salao
  where u.id = private.current_user_id()
    and lower(coalesce(u.status, '')) = 'ativo'
  limit 1;

  if v_nivel is null then return false; end if;

  v_default := case p_permissao
    when 'agenda_criar' then v_nivel in ('admin','gerente','profissional','recepcao')
    when 'agenda_editar' then v_nivel in ('admin','gerente','profissional','recepcao')
    when 'agenda_excluir' then v_nivel in ('admin','gerente')
    when 'clientes_criar' then v_nivel in ('admin','gerente','recepcao')
    when 'clientes_editar' then v_nivel in ('admin','gerente','recepcao')
    when 'clientes_excluir' then v_nivel in ('admin','gerente')
    when 'profissionais_criar' then v_nivel in ('admin','gerente')
    when 'profissionais_editar' then v_nivel in ('admin','gerente')
    when 'profissionais_excluir' then v_nivel = 'admin'
    when 'servicos_criar' then v_nivel in ('admin','gerente')
    when 'servicos_editar' then v_nivel in ('admin','gerente')
    when 'servicos_excluir' then v_nivel in ('admin','gerente')
    when 'produtos_criar' then v_nivel in ('admin','gerente')
    when 'produtos_editar' then v_nivel in ('admin','gerente')
    when 'produtos_excluir' then v_nivel in ('admin','gerente')
    when 'configuracoes_editar' then v_nivel = 'admin'
    else false
  end;

  return coalesce(v_override, v_default);
end;
$$;

create or replace function public.fn_usuario_atual()
returns usuarios language sql stable security definer set search_path=public
as $$ select u.* from public.usuarios u where u.id = private.current_user_id() limit 1 $$;

create or replace function public.fn_auth_user_id()
returns uuid language sql stable set search_path=public
as $$ select private.current_user_id() $$;

create or replace function public.fn_usuario_salao_logado()
returns uuid language sql stable security definer set search_path=public
as $$
  select u.id_salao from public.usuarios u
  where u.id = private.current_user_id()
    and coalesce(u.status, 'ativo') = 'ativo'
  limit 1
$$;

create or replace function public.get_my_salao_id()
returns uuid language sql stable security definer set search_path=public
as $$
  select u.id_salao from public.usuarios u
  where u.id = private.current_user_id()
    and coalesce(u.status, 'ativo') = 'ativo'
  limit 1
$$;

create or replace function public.get_my_user_nivel()
returns text language sql stable security definer set search_path=public
as $$
  select u.nivel from public.usuarios u
  where u.id = private.current_user_id()
    and coalesce(u.status, 'ativo') = 'ativo'
  limit 1
$$;

create or replace function public.get_meu_id_salao()
returns uuid language sql stable set search_path=public,extensions,pg_temp
as $$ select u.id_salao from public.usuarios u where u.id = private.current_user_id() limit 1 $$;

create or replace function public.get_my_permissions()
returns setof usuarios_permissoes language sql security definer set search_path=public
as $$
  select up.*
  from public.usuarios_permissoes up
  join public.usuarios u on u.id = up.id_usuario
  where u.id = private.current_user_id()
$$;

create or replace function public.registrar_auditoria(
  p_id_salao uuid,
  p_modulo text,
  p_entidade text,
  p_entidade_id uuid,
  p_acao text,
  p_descricao text default null,
  p_dados_anteriores jsonb default null,
  p_dados_novos jsonb default null,
  p_metadata jsonb default null
)
returns void language plpgsql security definer set search_path=public
as $$
declare
  v_id_usuario uuid := private.current_user_id();
begin
  insert into public.auditoria_logs(
    id_salao, auth_user_id, id_usuario, modulo, entidade, entidade_id,
    acao, descricao, dados_anteriores, dados_novos, metadata
  ) values (
    p_id_salao, v_id_usuario, v_id_usuario, p_modulo, p_entidade, p_entidade_id,
    p_acao, p_descricao, p_dados_anteriores, p_dados_novos,
    coalesce(p_metadata, '{}'::jsonb) ||
      jsonb_build_object('identity_provider','clerk','database_provider','neon')
  );
end;
$$;

create or replace function public.fn_get_or_create_servico_categoria(
  p_id_salao uuid,
  p_nome text
)
returns table(id uuid, nome text)
language plpgsql security definer set search_path=public
as $$
declare
  v_nome text := nullif(trim(coalesce(p_nome, '')), '');
  v_id uuid;
begin
  if p_id_salao is null then raise exception 'Salao nao informado.' using errcode='22023'; end if;
  if v_nome is null then raise exception 'Nome da categoria nao informado.' using errcode='22023'; end if;
  if current_user = 'salaopremium_app' and not private.usuario_tem_acesso_salao(p_id_salao) then
    raise exception 'Usuario sem acesso ao salao.' using errcode='42501';
  end if;

  select c.id into v_id
  from public.servicos_categorias c
  where c.id_salao = p_id_salao and lower(trim(c.nome)) = lower(v_nome)
  order by coalesce(c.ativo, true) desc, c.created_at asc
  limit 1;

  if v_id is not null then
    update public.servicos_categorias c set ativo=true, updated_at=now() where c.id=v_id;
    return query select c.id,c.nome from public.servicos_categorias c where c.id=v_id;
    return;
  end if;

  begin
    insert into public.servicos_categorias(id_salao,nome,ativo)
    values(p_id_salao,v_nome,true)
    returning servicos_categorias.id into v_id;
  exception when unique_violation then
    select c.id into v_id from public.servicos_categorias c
    where c.id_salao=p_id_salao and lower(trim(c.nome))=lower(v_nome)
    order by coalesce(c.ativo,true) desc,c.created_at asc limit 1;
    if v_id is null then raise; end if;
    update public.servicos_categorias c set ativo=true,updated_at=now() where c.id=v_id;
  end;

  return query select c.id,c.nome from public.servicos_categorias c where c.id=v_id;
end;
$$;

-- Supabase pg_net/vault cron dispatchers are not part of Neon runtime.
drop function if exists private.processar_notificacoes_salaopremiun_cron();
drop function if exists public.dispatch_whatsapp_automation_worker();

-- Rename stale operational database component key inside the existing probe.
do $$
declare v text;
begin
  select pg_get_functiondef(p.oid) into v
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='fn_operational_record_probe' and p.prokind='f'
  limit 1;
  if v is not null then
    v := replace(v, 'supabase.database', 'neon.database');
    execute v;
  end if;
end $$;

-- Replace Supabase role names in the security posture probe with the Neon app role.
do $$
declare v text;
begin
  select pg_get_functiondef(p.oid) into v
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='fn_operational_security_posture' and p.prokind='f'
  limit 1;
  if v is not null then
    v := replace(v, '''anon''', '''salaopremium_app''');
    v := replace(v, '''authenticated''', '''salaopremium_app''');
    v := replace(v, 'anon/authenticated', 'salaopremium_app');
    v := replace(v, 'auth.uid()', 'private.current_user_id()');
    execute v;
  end if;
end $$;

-- MFA-sensitive updates use app.aal set from Clerk session validation.
drop policy if exists mfa_admin_assinaturas_update on public.assinaturas;
create policy mfa_admin_assinaturas_update on public.assinaturas
as restrictive for update to salaopremium_app
using ((not private.fn_usuario_admin()) or private.current_aal()='aal2')
with check ((not private.fn_usuario_admin()) or private.current_aal()='aal2');

drop policy if exists mfa_admin_configuracoes_update on public.configuracoes_salao;
create policy mfa_admin_configuracoes_update on public.configuracoes_salao
as restrictive for update to salaopremium_app
using ((not private.fn_usuario_admin()) or private.current_aal()='aal2')
with check ((not private.fn_usuario_admin()) or private.current_aal()='aal2');

drop policy if exists mfa_admin_saloes_update on public.saloes;
create policy mfa_admin_saloes_update on public.saloes
as restrictive for update to salaopremium_app
using ((not private.fn_usuario_admin()) or private.current_aal()='aal2')
with check ((not private.fn_usuario_admin()) or private.current_aal()='aal2');

drop policy if exists mfa_admin_usuarios_update on public.usuarios;
create policy mfa_admin_usuarios_update on public.usuarios
as restrictive for update to salaopremium_app
using ((not private.fn_usuario_admin()) or private.current_aal()='aal2')
with check ((not private.fn_usuario_admin()) or private.current_aal()='aal2');

-- Tenant policies use internal usuario.id injected in app.user_id.
drop policy if exists clientes_ficha_tecnica_select on public.clientes_ficha_tecnica;
create policy clientes_ficha_tecnica_select on public.clientes_ficha_tecnica
for select to salaopremium_app
using (id_salao in (select u.id_salao from public.usuarios u where u.id=private.current_user_id()));

drop policy if exists clientes_ficha_tecnica_insert on public.clientes_ficha_tecnica;
create policy clientes_ficha_tecnica_insert on public.clientes_ficha_tecnica
for insert to salaopremium_app
with check (id_salao in (select u.id_salao from public.usuarios u where u.id=private.current_user_id()));

drop policy if exists clientes_ficha_tecnica_update on public.clientes_ficha_tecnica;
create policy clientes_ficha_tecnica_update on public.clientes_ficha_tecnica
for update to salaopremium_app
using (id_salao in (select u.id_salao from public.usuarios u where u.id=private.current_user_id()))
with check (id_salao in (select u.id_salao from public.usuarios u where u.id=private.current_user_id()));

drop policy if exists clientes_ficha_tecnica_delete on public.clientes_ficha_tecnica;
create policy clientes_ficha_tecnica_delete on public.clientes_ficha_tecnica
for delete to salaopremium_app
using (id_salao in (select u.id_salao from public.usuarios u where u.id=private.current_user_id()));

drop policy if exists clientes_preferencias_delete on public.clientes_preferencias;
create policy clientes_preferencias_delete on public.clientes_preferencias
for delete to salaopremium_app
using (id_salao in (select u.id_salao from public.usuarios u where u.id=private.current_user_id()));

drop policy if exists configuracoes_notificacoes_insert_mesmo_salao on public.configuracoes_notificacoes;
create policy configuracoes_notificacoes_insert_mesmo_salao on public.configuracoes_notificacoes
for insert to salaopremium_app
with check (exists(
  select 1 from public.usuarios u
  where u.id=private.current_user_id()
    and u.id_salao=configuracoes_notificacoes.id_salao
    and u.status='ativo'
));

drop policy if exists configuracoes_notificacoes_select_mesmo_salao on public.configuracoes_notificacoes;
create policy configuracoes_notificacoes_select_mesmo_salao on public.configuracoes_notificacoes
for select to salaopremium_app
using (exists(
  select 1 from public.usuarios u
  where u.id=private.current_user_id()
    and u.id_salao=configuracoes_notificacoes.id_salao
    and u.status='ativo'
));

drop policy if exists configuracoes_notificacoes_update_mesmo_salao on public.configuracoes_notificacoes;
create policy configuracoes_notificacoes_update_mesmo_salao on public.configuracoes_notificacoes
for update to salaopremium_app
using (exists(
  select 1 from public.usuarios u
  where u.id=private.current_user_id()
    and u.id_salao=configuracoes_notificacoes.id_salao
    and u.status='ativo'
))
with check (exists(
  select 1 from public.usuarios u
  where u.id=private.current_user_id()
    and u.id_salao=configuracoes_notificacoes.id_salao
    and u.status='ativo'
));

drop policy if exists usuarios_insert_mesmo_salao on public.usuarios;
create policy usuarios_insert_mesmo_salao on public.usuarios
for insert to salaopremium_app
with check (
  id=private.current_user_id()
  or (private.fn_usuario_admin() and id_salao=private.fn_id_salao_atual())
);

drop policy if exists usuarios_select_mesmo_salao on public.usuarios;
create policy usuarios_select_mesmo_salao on public.usuarios
for select to salaopremium_app
using (
  id=private.current_user_id()
  or email=private.current_user_email()
  or (private.fn_usuario_ativo() and id_salao=private.fn_id_salao_atual())
);

drop policy if exists usuarios_update_so_admin on public.usuarios;
create policy usuarios_update_so_admin on public.usuarios
for update to salaopremium_app
using (
  id=private.current_user_id()
  or (private.fn_usuario_admin() and id_salao=private.fn_id_salao_atual())
)
with check (
  id=private.current_user_id()
  or (private.fn_usuario_admin() and id_salao=private.fn_id_salao_atual())
);

-- Remove the final Supabase auth compatibility schema after dependencies are gone.
drop function if exists auth.uid();
drop function if exists auth.email();
drop function if exists auth.jwt();
drop schema if exists auth;
