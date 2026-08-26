begin;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'usuarios'
      and indexdef ilike '%(auth_user_id)%'
  ) then
    create index usuarios_auth_user_id_idx
      on public.usuarios (auth_user_id);
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'admin_master_usuarios'
      and indexdef ilike '%(auth_user_id)%'
  ) then
    create index admin_master_usuarios_auth_user_id_idx
      on public.admin_master_usuarios (auth_user_id);
  end if;
end
$$;

commit;
