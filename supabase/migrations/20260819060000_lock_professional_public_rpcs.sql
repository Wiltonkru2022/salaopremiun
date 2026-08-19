do $$
declare
  r record;
begin
  for r in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as function_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (
        p.proname like 'app_profissional_%'
        or p.proname = 'fn_cliente_registrar_credito_manual'
      )
  loop
    execute format(
      'revoke execute on function %I.%I(%s) from public, anon, authenticated',
      r.schema_name,
      r.function_name,
      r.function_args
    );

    execute format(
      'grant execute on function %I.%I(%s) to service_role',
      r.schema_name,
      r.function_name,
      r.function_args
    );
  end loop;
end
$$;
