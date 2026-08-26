create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

alter function public.fn_id_salao_atual() set schema private;
alter function public.fn_usuario_admin() set schema private;
alter function public.fn_usuario_ativo() set schema private;
alter function public.fn_usuario_mesmo_salao(uuid) set schema private;
alter function public.fn_usuario_nivel() set schema private;
alter function public.fn_usuario_pertence_ao_salao(uuid) set schema private;
alter function public.fn_usuario_tem_permissao(text) set schema private;
alter function public.profissional_usuario_admin_mesmo_salao(uuid) set schema private;
alter function public.profissional_usuario_mesmo_salao(uuid) set schema private;
alter function public.ticket_usuario_tem_acesso(uuid) set schema private;
alter function public.usuario_pode_operar_caixa(uuid) set schema private;
alter function public.usuario_pode_ver_suporte(uuid) set schema private;
alter function public.usuario_tem_acesso_salao(uuid) set schema private;

revoke all on function private.fn_id_salao_atual() from public, anon;
revoke all on function private.fn_usuario_admin() from public, anon;
revoke all on function private.fn_usuario_ativo() from public, anon;
revoke all on function private.fn_usuario_mesmo_salao(uuid) from public, anon;
revoke all on function private.fn_usuario_nivel() from public, anon;
revoke all on function private.fn_usuario_pertence_ao_salao(uuid) from public, anon;
revoke all on function private.fn_usuario_tem_permissao(text) from public, anon;
revoke all on function private.profissional_usuario_admin_mesmo_salao(uuid) from public, anon;
revoke all on function private.profissional_usuario_mesmo_salao(uuid) from public, anon;
revoke all on function private.ticket_usuario_tem_acesso(uuid) from public, anon;
revoke all on function private.usuario_pode_operar_caixa(uuid) from public, anon;
revoke all on function private.usuario_pode_ver_suporte(uuid) from public, anon;
revoke all on function private.usuario_tem_acesso_salao(uuid) from public, anon;

grant execute on function private.fn_id_salao_atual() to authenticated, service_role;
grant execute on function private.fn_usuario_admin() to authenticated, service_role;
grant execute on function private.fn_usuario_ativo() to authenticated, service_role;
grant execute on function private.fn_usuario_mesmo_salao(uuid) to authenticated, service_role;
grant execute on function private.fn_usuario_nivel() to authenticated, service_role;
grant execute on function private.fn_usuario_pertence_ao_salao(uuid) to authenticated, service_role;
grant execute on function private.fn_usuario_tem_permissao(text) to authenticated, service_role;
grant execute on function private.profissional_usuario_admin_mesmo_salao(uuid) to authenticated, service_role;
grant execute on function private.profissional_usuario_mesmo_salao(uuid) to authenticated, service_role;
grant execute on function private.ticket_usuario_tem_acesso(uuid) to authenticated, service_role;
grant execute on function private.usuario_pode_operar_caixa(uuid) to authenticated, service_role;
grant execute on function private.usuario_pode_ver_suporte(uuid) to authenticated, service_role;
grant execute on function private.usuario_tem_acesso_salao(uuid) to authenticated, service_role;

create or replace function private.ticket_usuario_tem_acesso(p_id_ticket uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
      from public.tickets t
     where t.id = p_id_ticket
       and private.usuario_pode_ver_suporte(t.id_salao)
  );
$function$;

create or replace function public.fn_get_or_create_servico_categoria(p_id_salao uuid, p_nome text)
returns table(id uuid, nome text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_nome text := nullif(trim(coalesce(p_nome, '')), '');
  v_id uuid;
begin
  if p_id_salao is null then
    raise exception 'Salao nao informado.' using errcode = '22023';
  end if;
  if v_nome is null then
    raise exception 'Nome da categoria nao informado.' using errcode = '22023';
  end if;
  if coalesce(auth.role(), '') <> 'service_role'
    and not private.usuario_tem_acesso_salao(p_id_salao)
  then
    raise exception 'Usuario sem acesso ao salao.' using errcode = '42501';
  end if;

  select c.id into v_id
  from public.servicos_categorias c
  where c.id_salao = p_id_salao
    and lower(trim(c.nome)) = lower(v_nome)
  order by coalesce(c.ativo, true) desc, c.created_at asc
  limit 1;

  if v_id is not null then
    update public.servicos_categorias c
    set ativo = true, updated_at = now()
    where c.id = v_id;
    return query select c.id, c.nome from public.servicos_categorias c where c.id = v_id;
    return;
  end if;

  begin
    insert into public.servicos_categorias (id_salao, nome, ativo)
    values (p_id_salao, v_nome, true)
    returning servicos_categorias.id into v_id;
  exception
    when unique_violation then
      select c.id into v_id
      from public.servicos_categorias c
      where c.id_salao = p_id_salao
        and lower(trim(c.nome)) = lower(v_nome)
      order by coalesce(c.ativo, true) desc, c.created_at asc
      limit 1;
      if v_id is null then raise; end if;
      update public.servicos_categorias c set ativo = true, updated_at = now() where c.id = v_id;
  end;

  return query select c.id, c.nome from public.servicos_categorias c where c.id = v_id;
end;
$function$;

alter policy mfa_admin_saloes_update on public.saloes
using (not private.fn_usuario_admin() or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2')
with check (not private.fn_usuario_admin() or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2');
alter policy mfa_admin_configuracoes_update on public.configuracoes_salao
using (not private.fn_usuario_admin() or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2')
with check (not private.fn_usuario_admin() or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2');
alter policy mfa_admin_assinaturas_update on public.assinaturas
using (not private.fn_usuario_admin() or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2')
with check (not private.fn_usuario_admin() or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2');
alter policy mfa_admin_usuarios_update on public.usuarios
using (not private.fn_usuario_admin() or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2')
with check (not private.fn_usuario_admin() or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2');
