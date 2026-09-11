create or replace function public.fn_operational_event_stats(
  p_since timestamptz default (now() - interval '24 hours')
)
returns table(
  modulo text,
  total_events bigint,
  failure_events bigint,
  user_error_events bigint,
  p50_ms numeric,
  p95_ms numeric,
  p99_ms numeric,
  last_event_at timestamptz,
  last_failure_at timestamptz
)
language sql
security invoker
set search_path = public, pg_temp
as $$
  select
    coalesce(nullif(trim(e.modulo), ''), 'sistema') as modulo,
    count(*)::bigint as total_events,
    count(*) filter (
      where e.eh_erro_usuario = false
        and (e.sucesso = false or e.severidade in ('error', 'critical'))
    )::bigint as failure_events,
    count(*) filter (where e.eh_erro_usuario = true)::bigint as user_error_events,
    percentile_cont(0.50) within group (order by e.response_ms)
      filter (where e.response_ms is not null)::numeric as p50_ms,
    percentile_cont(0.95) within group (order by e.response_ms)
      filter (where e.response_ms is not null)::numeric as p95_ms,
    percentile_cont(0.99) within group (order by e.response_ms)
      filter (where e.response_ms is not null)::numeric as p99_ms,
    max(e.created_at) as last_event_at,
    max(e.created_at) filter (
      where e.eh_erro_usuario = false
        and (e.sucesso = false or e.severidade in ('error', 'critical'))
    ) as last_failure_at
  from public.eventos_sistema e
  where e.created_at >= coalesce(p_since, now() - interval '24 hours')
  group by coalesce(nullif(trim(e.modulo), ''), 'sistema')
  order by failure_events desc, total_events desc;
$$;

create or replace function public.fn_operational_resolution_stats(
  p_since timestamptz default (now() - interval '30 days')
)
returns table(
  resolved_count bigint,
  automatic_count bigint,
  manual_count bigint,
  avg_mttr_seconds numeric,
  p95_mttr_seconds numeric
)
language sql
security invoker
set search_path = public, pg_temp
as $$
  select
    count(*)::bigint,
    count(*) filter (where i.resolution_mode = 'automatic')::bigint,
    count(*) filter (where i.resolution_mode = 'manual')::bigint,
    avg(extract(epoch from (i.resolvido_em - i.primeira_ocorrencia_em)))::numeric,
    percentile_cont(0.95) within group (
      order by extract(epoch from (i.resolvido_em - i.primeira_ocorrencia_em))
    )::numeric
  from public.incidentes_sistema i
  where i.status = 'resolvido'
    and i.resolvido_em is not null
    and i.resolvido_em >= coalesce(p_since, now() - interval '30 days');
$$;

create or replace function public.fn_operational_table_canary()
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'database', true,
    'saloes', to_regclass('public.saloes') is not null,
    'agendamentos', to_regclass('public.agendamentos') is not null,
    'clientes', to_regclass('public.clientes') is not null,
    'servicos', to_regclass('public.servicos') is not null,
    'comandas', to_regclass('public.comandas') is not null,
    'assinaturas', to_regclass('public.assinaturas') is not null,
    'checked_at', now()
  );
$$;

revoke all on function public.fn_operational_event_stats(timestamptz) from public, anon, authenticated;
grant execute on function public.fn_operational_event_stats(timestamptz) to service_role;
revoke all on function public.fn_operational_resolution_stats(timestamptz) from public, anon, authenticated;
grant execute on function public.fn_operational_resolution_stats(timestamptz) to service_role;
revoke all on function public.fn_operational_table_canary() from public, anon, authenticated;
grant execute on function public.fn_operational_table_canary() to service_role;
