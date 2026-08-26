create or replace function public.fn_observability_retention_cleanup(
  p_eventos_sistema_days integer default 45,
  p_logs_sistema_days integer default 30,
  p_acoes_automaticas_days integer default 45,
  p_eventos_webhook_days integer default 30,
  p_eventos_cron_days integer default 30,
  p_batch_limit integer default 500
)
returns table (
  table_name text,
  deleted_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_limit integer := greatest(coalesce(p_batch_limit, 500), 50);
  v_deleted integer := 0;
begin
  with alvo as (
    select id
    from public.eventos_sistema
    where created_at < now() - make_interval(days => greatest(coalesce(p_eventos_sistema_days, 45), 1))
    order by created_at asc
    limit v_batch_limit
  ),
  removidos as (
    delete from public.eventos_sistema
    where id in (select id from alvo)
    returning 1
  )
  select count(*)::integer into v_deleted from removidos;

  table_name := 'eventos_sistema';
  deleted_count := v_deleted;
  return next;

  with alvo as (
    select id
    from public.logs_sistema
    where criado_em < now() - make_interval(days => greatest(coalesce(p_logs_sistema_days, 30), 1))
    order by criado_em asc
    limit v_batch_limit
  ),
  removidos as (
    delete from public.logs_sistema
    where id in (select id from alvo)
    returning 1
  )
  select count(*)::integer into v_deleted from removidos;

  table_name := 'logs_sistema';
  deleted_count := v_deleted;
  return next;

  with alvo as (
    select id
    from public.acoes_automaticas_sistema
    where created_at < now() - make_interval(days => greatest(coalesce(p_acoes_automaticas_days, 45), 1))
    order by created_at asc
    limit v_batch_limit
  ),
  removidos as (
    delete from public.acoes_automaticas_sistema
    where id in (select id from alvo)
    returning 1
  )
  select count(*)::integer into v_deleted from removidos;

  table_name := 'acoes_automaticas_sistema';
  deleted_count := v_deleted;
  return next;

  with alvo as (
    select id
    from public.eventos_webhook
    where recebido_em < now() - make_interval(days => greatest(coalesce(p_eventos_webhook_days, 30), 1))
      and coalesce(status, 'pendente') not in ('pendente', 'erro')
    order by recebido_em asc
    limit v_batch_limit
  ),
  removidos as (
    delete from public.eventos_webhook
    where id in (select id from alvo)
    returning 1
  )
  select count(*)::integer into v_deleted from removidos;

  table_name := 'eventos_webhook';
  deleted_count := v_deleted;
  return next;

  with alvo as (
    select id
    from public.eventos_cron
    where iniciado_em < now() - make_interval(days => greatest(coalesce(p_eventos_cron_days, 30), 1))
      and coalesce(status, 'pendente') <> 'pendente'
    order by iniciado_em asc
    limit v_batch_limit
  ),
  removidos as (
    delete from public.eventos_cron
    where id in (select id from alvo)
    returning 1
  )
  select count(*)::integer into v_deleted from removidos;

  table_name := 'eventos_cron';
  deleted_count := v_deleted;
  return next;
end;
$$;
