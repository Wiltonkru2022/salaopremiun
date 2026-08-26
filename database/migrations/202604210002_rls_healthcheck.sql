create or replace function public.fn_validar_rls_critico()
returns table (
  tabela text,
  rls_habilitado boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.relname::text as tabela,
    c.relrowsecurity as rls_habilitado
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (
      'usuarios',
      'saloes',
      'clientes',
      'profissionais',
      'agendamentos',
      'comandas',
      'produtos',
      'assinaturas',
      'tickets'
    )
  order by c.relname;
$$;
grant execute on function public.fn_validar_rls_critico() to authenticated;
