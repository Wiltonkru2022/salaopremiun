create schema if not exists extensions;

do $$
begin
  if exists (
    select 1
    from pg_extension ext
    join pg_namespace n on n.oid = ext.extnamespace
    where ext.extname = 'unaccent'
      and n.nspname = 'public'
  ) then
    execute 'alter extension unaccent set schema extensions';
  end if;
end;
$$;

do $$
declare
  routine record;
begin
  for routine in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind in ('f', 'p')
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, '{}'::text[])) as conf(entry)
        where conf.entry like 'search_path=%'
      )
  loop
    execute format(
      'alter function %I.%I(%s) set search_path = public, extensions, pg_temp',
      routine.schema_name,
      routine.function_name,
      routine.identity_args
    );
  end loop;
end;
$$;

do $$
declare
  routine record;
begin
  for routine in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format(
      'revoke execute on function %I.%I(%s) from public, anon, authenticated',
      routine.schema_name,
      routine.function_name,
      routine.identity_args
    );
    execute format(
      'grant execute on function %I.%I(%s) to service_role',
      routine.schema_name,
      routine.function_name,
      routine.identity_args
    );
  end loop;
end;
$$;
