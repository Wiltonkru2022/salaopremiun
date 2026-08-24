-- Hardening de seguranca aplicado em producao em 2026-08-23.
-- Mantem helpers SECURITY DEFINER necessarios as policies, mas reforca contratos server-only
-- e exige MFA (AAL2) para escritas sensiveis de administradores do salao.

alter function public.touch_whatsapp_creditos_atualizado_em() set search_path = pg_catalog, public;
revoke all on function public.touch_whatsapp_creditos_atualizado_em() from public, anon, authenticated;
grant execute on function public.touch_whatsapp_creditos_atualizado_em() to service_role;

drop policy if exists mfa_admin_saloes_update on public.saloes;
create policy mfa_admin_saloes_update
on public.saloes
as restrictive
for update
to authenticated
using (
  not public.fn_usuario_admin()
  or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
)
with check (
  not public.fn_usuario_admin()
  or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
);

drop policy if exists mfa_admin_configuracoes_update on public.configuracoes_salao;
create policy mfa_admin_configuracoes_update
on public.configuracoes_salao
as restrictive
for update
to authenticated
using (
  not public.fn_usuario_admin()
  or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
)
with check (
  not public.fn_usuario_admin()
  or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
);

drop policy if exists mfa_admin_assinaturas_update on public.assinaturas;
create policy mfa_admin_assinaturas_update
on public.assinaturas
as restrictive
for update
to authenticated
using (
  not public.fn_usuario_admin()
  or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
)
with check (
  not public.fn_usuario_admin()
  or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
);

drop policy if exists mfa_admin_usuarios_update on public.usuarios;
create policy mfa_admin_usuarios_update
on public.usuarios
as restrictive
for update
to authenticated
using (
  not public.fn_usuario_admin()
  or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
)
with check (
  not public.fn_usuario_admin()
  or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
);

do $$
declare r record;
begin
  for r in
    select n.nspname, c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind in ('r','p')
       and c.relrowsecurity
       and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
  loop
    execute format('revoke all privileges on table %I.%I from anon, authenticated', r.nspname, r.relname);
  end loop;
end $$;

comment on function public.fn_id_salao_atual() is 'RLS helper: returns only the authenticated caller tenant id; authenticated EXECUTE is required by policies.';
comment on function public.fn_usuario_admin() is 'RLS helper: boolean for current authenticated user; authenticated EXECUTE is required by policies.';
comment on function public.fn_usuario_ativo() is 'RLS helper: boolean for current authenticated user; authenticated EXECUTE is required by policies.';
comment on function public.fn_usuario_mesmo_salao(uuid) is 'RLS helper: tenant membership boolean scoped to auth.uid(); authenticated EXECUTE is required by policies.';
comment on function public.fn_usuario_nivel() is 'RLS helper: current authenticated user level; authenticated EXECUTE is required by policies.';
comment on function public.fn_usuario_pertence_ao_salao(uuid) is 'RLS helper: tenant membership boolean scoped to auth.uid(); authenticated EXECUTE is required by policies.';
comment on function public.fn_usuario_tem_permissao(text) is 'RLS helper: permission boolean scoped to auth.uid(); authenticated EXECUTE is required by policies.';
comment on function public.profissional_usuario_admin_mesmo_salao(uuid) is 'RLS helper: admin/manager same-salon boolean scoped to auth.uid(); authenticated EXECUTE is required by policies.';
comment on function public.profissional_usuario_mesmo_salao(uuid) is 'RLS helper: professional same-salon boolean scoped to auth.uid(); authenticated EXECUTE is required by policies.';
comment on function public.ticket_usuario_tem_acesso(uuid) is 'RLS helper: support ticket access boolean scoped to auth.uid(); authenticated EXECUTE is required by policies.';
comment on function public.usuario_pode_operar_caixa(uuid) is 'RLS helper: cash register access boolean scoped to auth.uid(); authenticated EXECUTE is required by policies.';
comment on function public.usuario_pode_ver_suporte(uuid) is 'RLS helper: support access boolean scoped to auth.uid(); authenticated EXECUTE is required by policies.';
comment on function public.usuario_tem_acesso_salao(uuid) is 'RLS helper: tenant access boolean scoped to auth.uid(); authenticated EXECUTE is required by policies.';
