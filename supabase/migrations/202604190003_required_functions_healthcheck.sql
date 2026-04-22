create or replace function public.fn_validar_funcoes_obrigatorias(
  p_function_names text[]
)
returns table(function_name text, function_exists boolean)
language sql
security definer
set search_path = public
as $$
  select
    required.function_name,
    exists (
      select 1
      from pg_proc p
      join pg_namespace n
        on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = required.function_name
    ) as function_exists
  from unnest(coalesce(p_function_names, array[]::text[])) as required(function_name)
  order by required.function_name;
$$;

grant execute on function public.fn_validar_funcoes_obrigatorias(text[]) to service_role;
