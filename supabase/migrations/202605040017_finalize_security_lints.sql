begin;

create or replace function public.fn_auth_user_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select (select auth.uid());
$$;

revoke all on function public.profissional_usuario_mesmo_salao(uuid) from public, anon, authenticated;
revoke all on function public.profissional_usuario_admin_mesmo_salao(uuid) from public, anon, authenticated;
grant execute on function public.profissional_usuario_mesmo_salao(uuid) to service_role;
grant execute on function public.profissional_usuario_admin_mesmo_salao(uuid) to service_role;

commit;
