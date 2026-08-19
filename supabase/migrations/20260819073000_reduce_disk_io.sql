-- Reduz o consumo de Disk I/O do projeto sem alterar dados de negocio.
-- Principais pontos:
-- 1) cron de notificacoes volta para 5 minutos e so chama HTTP quando existe job vencido;
-- 2) remove limpeza redundante do pg_net (o proprio pg_net aplica TTL);
-- 3) limita historico do pg_cron;
-- 4) evita reavaliacao desnecessaria de auth.uid() em helpers/RLS;
-- 5) inclui retencao para filas/logs de Web Push ja finalizados.

create or replace function private.processar_notificacoes_salaopremiun_cron()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
  v_request_id bigint;
  v_tem_pendente boolean := false;
begin
  -- A consulta usa o indice parcial de notification_jobs. Se nao existe
  -- notificacao vencida, nao cria requisicao pg_net nem grava resposta HTTP.
  select exists (
    select 1
    from public.notification_jobs
    where status = 'pendente'
      and enviar_em <= now()
  )
  into v_tem_pendente;

  if not v_tem_pendente then
    return null;
  end if;

  select decrypted_secret
    into v_secret
  from vault.decrypted_secrets
  where name = 'salaopremiun_cron_secret'
  limit 1;

  if coalesce(v_secret, '') = '' then
    raise log 'salaopremiun_cron_secret ausente no Supabase Vault; cron de notificacoes ignorado.';
    return null;
  end if;

  select net.http_post(
    url := 'https://salaopremiun.com.br/api/cron/notificacoes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := jsonb_build_object(
      'source', 'supabase_cron',
      'job', 'processar-notificacoes-salaopremiun',
      'triggered_at', now()
    ),
    timeout_milliseconds := 10000
  )
  into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function private.processar_notificacoes_salaopremiun_cron() from public;
revoke all on function private.processar_notificacoes_salaopremiun_cron() from anon;
revoke all on function private.processar_notificacoes_salaopremiun_cron() from authenticated;

do $$
begin
  perform cron.unschedule('processar-notificacoes-salaopremiun');
exception
  when others then null;
end $$;

select cron.schedule(
  'processar-notificacoes-salaopremiun',
  '*/5 * * * *',
  $$select private.processar_notificacoes_salaopremiun_cron();$$
);

-- pg_net ja remove respostas automaticamente pelo TTL configurado na extensao.
-- Esse job fazia uma segunda varredura/delecao sem necessidade.
do $$
begin
  perform cron.unschedule('limpar-pg-net-salaopremiun');
exception
  when others then null;
end $$;

-- Mantem somente uma janela curta do historico do pg_cron.
do $$
begin
  perform cron.unschedule('limpar-historico-pg-cron-salaopremiun');
exception
  when others then null;
end $$;

select cron.schedule(
  'limpar-historico-pg-cron-salaopremiun',
  '23 4 * * 0',
  $$delete from cron.job_run_details where end_time < now() - interval '14 days';$$
);

delete from cron.job_run_details
where end_time < now() - interval '14 days';

-- Helpers de sessao: auth.uid() vira InitPlan reutilizavel na consulta.
create or replace function public.fn_usuario_salao_logado()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id_salao
  from public.usuarios u
  where u.auth_user_id = (select auth.uid())
    and coalesce(u.status, 'ativo') = 'ativo'
  limit 1
$$;

create or replace function public.get_meu_id_salao()
returns uuid
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select u.id_salao
  from public.usuarios u
  where u.auth_user_id = (select auth.uid())
  limit 1
$$;

create or replace function public.get_my_permissions()
returns setof public.usuarios_permissoes
language sql
security definer
set search_path = public
as $$
  select up.*
  from public.usuarios_permissoes up
  join public.usuarios u on u.id = up.id_usuario
  where u.auth_user_id = (select auth.uid())
  limit 1
$$;

create or replace function public.get_my_salao_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id_salao
  from public.usuarios u
  where u.auth_user_id = (select auth.uid())
    and coalesce(u.status, 'ativo') = 'ativo'
  limit 1
$$;

create or replace function public.get_my_user_nivel()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.nivel
  from public.usuarios u
  where u.auth_user_id = (select auth.uid())
    and coalesce(u.status, 'ativo') = 'ativo'
  limit 1
$$;

create or replace function public.registrar_auditoria(
  p_id_salao uuid,
  p_modulo text,
  p_entidade text,
  p_entidade_id uuid,
  p_acao text,
  p_descricao text default null,
  p_dados_anteriores jsonb default null,
  p_dados_novos jsonb default null,
  p_metadata jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id_usuario uuid;
  v_auth_user_id uuid := (select auth.uid());
begin
  select u.id
    into v_id_usuario
  from public.usuarios u
  where u.auth_user_id = v_auth_user_id
  limit 1;

  insert into public.auditoria_logs (
    id_salao,
    auth_user_id,
    id_usuario,
    modulo,
    entidade,
    entidade_id,
    acao,
    descricao,
    dados_anteriores,
    dados_novos,
    metadata
  )
  values (
    p_id_salao,
    v_auth_user_id,
    v_id_usuario,
    p_modulo,
    p_entidade,
    p_entidade_id,
    p_acao,
    p_descricao,
    p_dados_anteriores,
    p_dados_novos,
    p_metadata
  );
end;
$$;

-- Corrige os tres avisos auth_rls_initplan do Performance Advisor.
drop policy if exists configuracoes_notificacoes_select_mesmo_salao
  on public.configuracoes_notificacoes;
create policy configuracoes_notificacoes_select_mesmo_salao
on public.configuracoes_notificacoes
for select to authenticated
using (
  exists (
    select 1
    from public.usuarios u
    where u.auth_user_id = (select auth.uid())
      and u.id_salao = configuracoes_notificacoes.id_salao
      and u.status = 'ativo'
  )
);

drop policy if exists configuracoes_notificacoes_insert_mesmo_salao
  on public.configuracoes_notificacoes;
create policy configuracoes_notificacoes_insert_mesmo_salao
on public.configuracoes_notificacoes
for insert to authenticated
with check (
  exists (
    select 1
    from public.usuarios u
    where u.auth_user_id = (select auth.uid())
      and u.id_salao = configuracoes_notificacoes.id_salao
      and u.status = 'ativo'
  )
);

drop policy if exists configuracoes_notificacoes_update_mesmo_salao
  on public.configuracoes_notificacoes;
create policy configuracoes_notificacoes_update_mesmo_salao
on public.configuracoes_notificacoes
for update to authenticated
using (
  exists (
    select 1
    from public.usuarios u
    where u.auth_user_id = (select auth.uid())
      and u.id_salao = configuracoes_notificacoes.id_salao
      and u.status = 'ativo'
  )
)
with check (
  exists (
    select 1
    from public.usuarios u
    where u.auth_user_id = (select auth.uid())
      and u.id_salao = configuracoes_notificacoes.id_salao
      and u.status = 'ativo'
  )
);

-- Mantem a assinatura existente para nao quebrar o endpoint diario de limpeza,
-- acrescentando retencao de jobs finalizados e diagnosticos de Web Push.
create or replace function public.fn_observability_retention_cleanup(
  p_eventos_sistema_days integer default 45,
  p_logs_sistema_days integer default 30,
  p_auditoria_logs_days integer default 180,
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
    select id from public.eventos_sistema
    where created_at < now() - make_interval(days => greatest(coalesce(p_eventos_sistema_days, 45), 1))
    order by created_at asc limit v_batch_limit
  ), removidos as (
    delete from public.eventos_sistema where id in (select id from alvo) returning 1
  ) select count(*)::integer into v_deleted from removidos;
  table_name := 'eventos_sistema'; deleted_count := v_deleted; return next;

  with alvo as (
    select id from public.logs_sistema
    where criado_em < now() - make_interval(days => greatest(coalesce(p_logs_sistema_days, 30), 1))
    order by criado_em asc limit v_batch_limit
  ), removidos as (
    delete from public.logs_sistema where id in (select id from alvo) returning 1
  ) select count(*)::integer into v_deleted from removidos;
  table_name := 'logs_sistema'; deleted_count := v_deleted; return next;

  with alvo as (
    select id from public.auditoria_logs
    where created_at < now() - make_interval(days => greatest(coalesce(p_auditoria_logs_days, 180), 30))
    order by created_at asc limit v_batch_limit
  ), removidos as (
    delete from public.auditoria_logs where id in (select id from alvo) returning 1
  ) select count(*)::integer into v_deleted from removidos;
  table_name := 'auditoria_logs'; deleted_count := v_deleted; return next;

  with alvo as (
    select id from public.acoes_automaticas_sistema
    where created_at < now() - make_interval(days => greatest(coalesce(p_acoes_automaticas_days, 45), 1))
    order by created_at asc limit v_batch_limit
  ), removidos as (
    delete from public.acoes_automaticas_sistema where id in (select id from alvo) returning 1
  ) select count(*)::integer into v_deleted from removidos;
  table_name := 'acoes_automaticas_sistema'; deleted_count := v_deleted; return next;

  with alvo as (
    select id from public.eventos_webhook
    where recebido_em < now() - make_interval(days => greatest(coalesce(p_eventos_webhook_days, 30), 1))
      and coalesce(status, 'pendente') not in ('pendente', 'erro')
    order by recebido_em asc limit v_batch_limit
  ), removidos as (
    delete from public.eventos_webhook where id in (select id from alvo) returning 1
  ) select count(*)::integer into v_deleted from removidos;
  table_name := 'eventos_webhook'; deleted_count := v_deleted; return next;

  with alvo as (
    select id from public.eventos_cron
    where iniciado_em < now() - make_interval(days => greatest(coalesce(p_eventos_cron_days, 30), 1))
      and coalesce(status, 'pendente') <> 'pendente'
    order by iniciado_em asc limit v_batch_limit
  ), removidos as (
    delete from public.eventos_cron where id in (select id from alvo) returning 1
  ) select count(*)::integer into v_deleted from removidos;
  table_name := 'eventos_cron'; deleted_count := v_deleted; return next;

  with alvo as (
    select id from public.notification_jobs
    where updated_at < now() - interval '60 days'
      and status in ('enviada', 'falhou', 'cancelada')
    order by updated_at asc limit v_batch_limit
  ), removidos as (
    delete from public.notification_jobs where id in (select id from alvo) returning 1
  ) select count(*)::integer into v_deleted from removidos;
  table_name := 'notification_jobs'; deleted_count := v_deleted; return next;

  with alvo as (
    select id from public.push_delivery_log
    where created_at < now() - interval '30 days'
    order by created_at asc limit v_batch_limit
  ), removidos as (
    delete from public.push_delivery_log where id in (select id from alvo) returning 1
  ) select count(*)::integer into v_deleted from removidos;
  table_name := 'push_delivery_log'; deleted_count := v_deleted; return next;
end;
$$;
