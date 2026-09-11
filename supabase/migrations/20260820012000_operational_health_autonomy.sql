create extension if not exists pgcrypto;

create table if not exists public.operational_components (
  component_key text primary key,
  nome text not null,
  descricao text,
  categoria text not null,
  superficie text,
  criticidade text not null default 'medium',
  responsavel text not null default 'Plataforma',
  runbook text,
  visibilidade_publica boolean not null default false,
  tipo_probe text not null default 'telemetry',
  intervalo_esperado_segundos integer not null default 600,
  freshness_ttl_segundos integer not null default 1800,
  timeout_ms integer not null default 5000,
  slo_alvo numeric(5,2),
  sucessos_para_recuperar integer not null default 3,
  falhas_para_degradar integer not null default 2,
  cooldown_segundos integer not null default 300,
  monitorado boolean not null default true,
  habilitado boolean not null default true,
  estado_atual text not null default 'unknown',
  motivo_estado text,
  ultima_verificacao_em timestamptz,
  ultimo_sucesso_em timestamptz,
  ultima_falha_em timestamptz,
  deployment_id text,
  commit_sha text,
  registry_version text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operational_components_state_idx
  on public.operational_components (estado_atual, criticidade, updated_at desc);
create index if not exists operational_components_category_idx
  on public.operational_components (categoria, habilitado, visibilidade_publica);

create table if not exists public.operational_component_dependencies (
  component_key text not null references public.operational_components(component_key) on delete cascade,
  depends_on_component_key text not null references public.operational_components(component_key) on delete cascade,
  relacao text not null default 'required',
  critica boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (component_key, depends_on_component_key),
  check (component_key <> depends_on_component_key)
);

alter table public.health_checks_sistema
  add column if not exists component_key text references public.operational_components(component_key) on delete set null,
  add column if not exists probe_key text,
  add column if not exists latency_ms integer,
  add column if not exists intervalo_esperado_segundos integer,
  add column if not exists freshness_ttl_segundos integer,
  add column if not exists sucessos_consecutivos integer not null default 0,
  add column if not exists falhas_consecutivas integer not null default 0,
  add column if not exists primeiro_saudavel_em timestamptz,
  add column if not exists ultimo_sucesso_em timestamptz,
  add column if not exists ultima_falha_em timestamptz,
  add column if not exists motivo_status text,
  add column if not exists evidence_json jsonb not null default '{}'::jsonb,
  add column if not exists deployment_id text,
  add column if not exists commit_sha text,
  add column if not exists probe_version text;

create index if not exists health_checks_component_idx
  on public.health_checks_sistema (component_key, atualizado_em desc);
create index if not exists health_checks_freshness_idx
  on public.health_checks_sistema (atualizado_em desc, status);

alter table public.incidentes_sistema
  add column if not exists fingerprint text,
  add column if not exists component_key text references public.operational_components(component_key) on delete set null,
  add column if not exists catalog_code text,
  add column if not exists categoria text,
  add column if not exists sintoma text,
  add column if not exists causa_provavel text,
  add column if not exists confianca text,
  add column if not exists responsavel text,
  add column if not exists root_cause_candidate text,
  add column if not exists priority_score integer,
  add column if not exists visibilidade_publica boolean not null default false,
  add column if not exists mensagem_publica text,
  add column if not exists primeiro_deployment_id text,
  add column if not exists primeiro_commit_sha text,
  add column if not exists ultimo_deployment_id text,
  add column if not exists ultimo_commit_sha text,
  add column if not exists resolution_mode text,
  add column if not exists resolution_confidence text,
  add column if not exists first_healthy_at timestamptz,
  add column if not exists recovery_verified_at timestamptz,
  add column if not exists healthy_probe_count integer not null default 0,
  add column if not exists required_healthy_probes integer not null default 3,
  add column if not exists last_failed_probe_at timestamptz,
  add column if not exists resolved_deployment_id text,
  add column if not exists resolved_commit_sha text,
  add column if not exists resolution_evidence jsonb not null default '{}'::jsonb,
  add column if not exists resolution_reason text,
  add column if not exists resolver_version text,
  add column if not exists reopened_count integer not null default 0,
  add column if not exists last_reopened_at timestamptz,
  add column if not exists last_success_at timestamptz,
  add column if not exists suppressed_until timestamptz;

update public.incidentes_sistema
set fingerprint = encode(digest(chave, 'sha256'), 'hex')
where fingerprint is null and chave is not null;

create unique index if not exists incidentes_sistema_fingerprint_uidx
  on public.incidentes_sistema (fingerprint)
  where fingerprint is not null;
create index if not exists incidentes_sistema_component_state_idx
  on public.incidentes_sistema (component_key, status, ultima_ocorrencia_em desc);
create index if not exists incidentes_sistema_resolution_idx
  on public.incidentes_sistema (status, recovery_verified_at, resolvido_em desc);

create table if not exists public.incident_updates (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidentes_sistema(id) on delete cascade,
  status_from text,
  status_to text not null,
  mensagem text not null,
  internal_details jsonb not null default '{}'::jsonb,
  public_message text,
  public_visible boolean not null default false,
  deployment_id text,
  commit_sha text,
  created_at timestamptz not null default now()
);

create index if not exists incident_updates_incident_idx
  on public.incident_updates (incident_id, created_at desc);
create index if not exists incident_updates_public_idx
  on public.incident_updates (public_visible, created_at desc);

create table if not exists public.operational_probe_history (
  id uuid primary key default gen_random_uuid(),
  component_key text not null references public.operational_components(component_key) on delete cascade,
  probe_key text not null,
  status text not null,
  component_state text not null,
  latency_ms integer,
  evidence_json jsonb not null default '{}'::jsonb,
  deployment_id text,
  commit_sha text,
  checked_at timestamptz not null default now()
);

create index if not exists operational_probe_history_component_idx
  on public.operational_probe_history (component_key, checked_at desc);
create index if not exists operational_probe_history_failures_idx
  on public.operational_probe_history (status, checked_at desc)
  where status <> 'ok';

create table if not exists public.status_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status text not null default 'pending',
  confirm_token_hash text,
  unsubscribe_token_hash text not null,
  scope text not null default 'all',
  confirmado_em timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists status_subscriptions_email_uidx
  on public.status_subscriptions (lower(email));
create unique index if not exists status_subscriptions_confirm_token_uidx
  on public.status_subscriptions (confirm_token_hash)
  where confirm_token_hash is not null;
create unique index if not exists status_subscriptions_unsubscribe_token_uidx
  on public.status_subscriptions (unsubscribe_token_hash);

create table if not exists public.status_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.status_subscriptions(id) on delete cascade,
  incident_update_id uuid not null references public.incident_updates(id) on delete cascade,
  status text not null default 'pending',
  provider_message_id text,
  erro_texto text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (subscription_id, incident_update_id)
);

create index if not exists status_notification_deliveries_pending_idx
  on public.status_notification_deliveries (status, created_at asc);

create or replace function public.fn_operational_observe_incident(
  p_fingerprint text,
  p_chave text,
  p_titulo text,
  p_modulo text,
  p_severidade text,
  p_component_key text default null,
  p_catalog_code text default null,
  p_categoria text default null,
  p_sintoma text default null,
  p_causa_provavel text default null,
  p_confianca text default null,
  p_responsavel text default null,
  p_acao_sugerida text default null,
  p_reference jsonb default '{}'::jsonb,
  p_public_visible boolean default false,
  p_public_message text default null,
  p_deployment_id text default null,
  p_commit_sha text default null,
  p_required_healthy_probes integer default 3
)
returns table(incident_id uuid, incident_status text, reopened boolean)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_status text;
  v_reopened boolean := false;
  v_now timestamptz := now();
begin
  if coalesce(trim(p_fingerprint), '') = '' then
    raise exception 'fingerprint obrigatorio';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_fingerprint, 0));

  select id, status into v_id, v_status
  from public.incidentes_sistema
  where fingerprint = p_fingerprint
  for update;

  if v_id is null then
    insert into public.incidentes_sistema (
      chave, fingerprint, titulo, modulo, severidade, status,
      component_key, catalog_code, categoria, sintoma, causa_provavel,
      confianca, responsavel, acao_sugerida, referencia_json,
      visibilidade_publica, mensagem_publica,
      primeiro_deployment_id, primeiro_commit_sha,
      ultimo_deployment_id, ultimo_commit_sha,
      required_healthy_probes, primeira_ocorrencia_em, ultima_ocorrencia_em,
      created_at, updated_at
    ) values (
      coalesce(nullif(trim(p_chave), ''), p_fingerprint), p_fingerprint,
      coalesce(nullif(trim(p_titulo), ''), 'Incidente operacional'),
      coalesce(nullif(trim(p_modulo), ''), 'sistema'),
      coalesce(nullif(trim(p_severidade), ''), 'media'), 'aberto',
      nullif(trim(p_component_key), ''), nullif(trim(p_catalog_code), ''),
      nullif(trim(p_categoria), ''), nullif(trim(p_sintoma), ''),
      nullif(trim(p_causa_provavel), ''), nullif(trim(p_confianca), ''),
      nullif(trim(p_responsavel), ''), nullif(trim(p_acao_sugerida), ''),
      coalesce(p_reference, '{}'::jsonb), coalesce(p_public_visible, false),
      nullif(trim(p_public_message), ''), nullif(trim(p_deployment_id), ''),
      nullif(trim(p_commit_sha), ''), nullif(trim(p_deployment_id), ''),
      nullif(trim(p_commit_sha), ''), greatest(coalesce(p_required_healthy_probes, 3), 1),
      v_now, v_now, v_now, v_now
    ) returning id into v_id;

    insert into public.incident_updates (
      incident_id, status_from, status_to, mensagem, internal_details,
      public_message, public_visible, deployment_id, commit_sha, created_at
    ) values (
      v_id, null, 'aberto', 'Incidente detectado automaticamente.',
      jsonb_build_object('catalog_code', p_catalog_code, 'fingerprint', p_fingerprint),
      p_public_message, coalesce(p_public_visible, false), p_deployment_id, p_commit_sha, v_now
    );
  else
    v_reopened := v_status = 'resolvido';

    update public.incidentes_sistema
    set titulo = coalesce(nullif(trim(p_titulo), ''), titulo),
        modulo = coalesce(nullif(trim(p_modulo), ''), modulo),
        severidade = coalesce(nullif(trim(p_severidade), ''), severidade),
        status = 'aberto',
        component_key = coalesce(nullif(trim(p_component_key), ''), component_key),
        catalog_code = coalesce(nullif(trim(p_catalog_code), ''), catalog_code),
        categoria = coalesce(nullif(trim(p_categoria), ''), categoria),
        sintoma = coalesce(nullif(trim(p_sintoma), ''), sintoma),
        causa_provavel = coalesce(nullif(trim(p_causa_provavel), ''), causa_provavel),
        confianca = coalesce(nullif(trim(p_confianca), ''), confianca),
        responsavel = coalesce(nullif(trim(p_responsavel), ''), responsavel),
        acao_sugerida = coalesce(nullif(trim(p_acao_sugerida), ''), acao_sugerida),
        referencia_json = coalesce(p_reference, referencia_json),
        visibilidade_publica = coalesce(p_public_visible, visibilidade_publica),
        mensagem_publica = coalesce(nullif(trim(p_public_message), ''), mensagem_publica),
        total_ocorrencias = total_ocorrencias + 1,
        ultima_ocorrencia_em = v_now,
        ultimo_deployment_id = coalesce(nullif(trim(p_deployment_id), ''), ultimo_deployment_id),
        ultimo_commit_sha = coalesce(nullif(trim(p_commit_sha), ''), ultimo_commit_sha),
        resolvido_em = null,
        resolution_mode = case when v_reopened then null else resolution_mode end,
        resolution_confidence = case when v_reopened then null else resolution_confidence end,
        first_healthy_at = case when v_reopened then null else first_healthy_at end,
        recovery_verified_at = case when v_reopened then null else recovery_verified_at end,
        healthy_probe_count = 0,
        resolution_evidence = case when v_reopened then '{}'::jsonb else resolution_evidence end,
        resolution_reason = case when v_reopened then null else resolution_reason end,
        resolved_deployment_id = case when v_reopened then null else resolved_deployment_id end,
        resolved_commit_sha = case when v_reopened then null else resolved_commit_sha end,
        reopened_count = reopened_count + case when v_reopened then 1 else 0 end,
        last_reopened_at = case when v_reopened then v_now else last_reopened_at end,
        updated_at = v_now
    where id = v_id;

    if v_reopened then
      insert into public.incident_updates (
        incident_id, status_from, status_to, mensagem, internal_details,
        public_message, public_visible, deployment_id, commit_sha, created_at
      ) values (
        v_id, v_status, 'aberto', 'Incidente reaberto automaticamente por nova ocorrência.',
        jsonb_build_object('catalog_code', p_catalog_code, 'fingerprint', p_fingerprint),
        p_public_message, coalesce(p_public_visible, false), p_deployment_id, p_commit_sha, v_now
      );
    end if;
  end if;

  return query select v_id, 'aberto'::text, v_reopened;
end;
$$;

create or replace function public.fn_operational_record_probe(
  p_component_key text,
  p_probe_key text,
  p_name text,
  p_status text,
  p_score integer,
  p_latency_ms integer default null,
  p_motivo text default null,
  p_evidence jsonb default '{}'::jsonb,
  p_deployment_id text default null,
  p_commit_sha text default null,
  p_intervalo_esperado_segundos integer default 600,
  p_freshness_ttl_segundos integer default 1800,
  p_sucessos_para_recuperar integer default 3,
  p_falhas_para_degradar integer default 2,
  p_probe_version text default 'v1'
)
returns table(
  check_id uuid,
  component_state text,
  consecutive_successes integer,
  consecutive_failures integer
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_check_id uuid;
  v_previous_status text;
  v_previous_state text;
  v_criticality text;
  v_successes integer := 0;
  v_failures integer := 0;
  v_new_state text;
  v_now timestamptz := now();
  v_should_sample boolean := false;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_component_key || ':' || p_probe_key, 0));

  select estado_atual, criticidade
    into v_previous_state, v_criticality
  from public.operational_components
  where component_key = p_component_key
  for update;

  if v_previous_state is null then
    raise exception 'componente operacional nao registrado: %', p_component_key;
  end if;

  select id, status, sucessos_consecutivos, falhas_consecutivas
    into v_check_id, v_previous_status, v_successes, v_failures
  from public.health_checks_sistema
  where chave = p_probe_key
  for update;

  if p_status = 'ok' then
    v_successes := coalesce(v_successes, 0) + 1;
    v_failures := 0;
  elsif p_status in ('warning', 'critical') then
    v_failures := coalesce(v_failures, 0) + 1;
    v_successes := 0;
  else
    v_successes := 0;
    v_failures := 0;
  end if;

  if p_status = 'unknown' then
    v_new_state := 'unknown';
  elsif p_status = 'ok' and v_successes >= greatest(coalesce(p_sucessos_para_recuperar, 3), 1) then
    v_new_state := 'operational';
  elsif p_status = 'critical' and v_failures >= greatest(coalesce(p_falhas_para_degradar, 2), 1) then
    v_new_state := case
      when v_criticality = 'critical' then 'major_outage'
      when v_criticality = 'high' then 'partial_outage'
      else 'degraded'
    end;
  elsif p_status = 'warning' and v_failures >= greatest(coalesce(p_falhas_para_degradar, 2), 1) then
    v_new_state := 'degraded';
  else
    v_new_state := coalesce(v_previous_state, 'unknown');
  end if;

  insert into public.health_checks_sistema (
    chave, nome, status, score, detalhes_json, atualizado_em,
    component_key, probe_key, latency_ms, intervalo_esperado_segundos,
    freshness_ttl_segundos, sucessos_consecutivos, falhas_consecutivas,
    primeiro_saudavel_em, ultimo_sucesso_em, ultima_falha_em, motivo_status,
    evidence_json, deployment_id, commit_sha, probe_version
  ) values (
    p_probe_key, p_name, p_status, greatest(0, least(100, coalesce(p_score, 0))),
    coalesce(p_evidence, '{}'::jsonb), v_now, p_component_key, p_probe_key,
    p_latency_ms, p_intervalo_esperado_segundos, p_freshness_ttl_segundos,
    v_successes, v_failures,
    case when p_status = 'ok' then v_now else null end,
    case when p_status = 'ok' then v_now else null end,
    case when p_status in ('warning', 'critical') then v_now else null end,
    p_motivo, coalesce(p_evidence, '{}'::jsonb), p_deployment_id, p_commit_sha, p_probe_version
  )
  on conflict (chave) do update set
    nome = excluded.nome,
    status = excluded.status,
    score = excluded.score,
    detalhes_json = excluded.detalhes_json,
    atualizado_em = excluded.atualizado_em,
    component_key = excluded.component_key,
    probe_key = excluded.probe_key,
    latency_ms = excluded.latency_ms,
    intervalo_esperado_segundos = excluded.intervalo_esperado_segundos,
    freshness_ttl_segundos = excluded.freshness_ttl_segundos,
    sucessos_consecutivos = excluded.sucessos_consecutivos,
    falhas_consecutivas = excluded.falhas_consecutivas,
    primeiro_saudavel_em = coalesce(public.health_checks_sistema.primeiro_saudavel_em, excluded.primeiro_saudavel_em),
    ultimo_sucesso_em = case when excluded.status = 'ok' then excluded.atualizado_em else public.health_checks_sistema.ultimo_sucesso_em end,
    ultima_falha_em = case when excluded.status in ('warning', 'critical') then excluded.atualizado_em else public.health_checks_sistema.ultima_falha_em end,
    motivo_status = excluded.motivo_status,
    evidence_json = excluded.evidence_json,
    deployment_id = excluded.deployment_id,
    commit_sha = excluded.commit_sha,
    probe_version = excluded.probe_version
  returning id into v_check_id;

  update public.operational_components
  set estado_atual = v_new_state,
      motivo_estado = p_motivo,
      ultima_verificacao_em = v_now,
      ultimo_sucesso_em = case when p_status = 'ok' then v_now else ultimo_sucesso_em end,
      ultima_falha_em = case when p_status in ('warning', 'critical') then v_now else ultima_falha_em end,
      deployment_id = coalesce(p_deployment_id, deployment_id),
      commit_sha = coalesce(p_commit_sha, commit_sha),
      updated_at = v_now
  where component_key = p_component_key;

  v_should_sample := p_status <> 'ok' or v_previous_status is distinct from p_status;
  if not v_should_sample then
    select not exists (
      select 1
      from public.operational_probe_history
      where component_key = p_component_key
        and probe_key = p_probe_key
        and checked_at >= v_now - interval '1 hour'
    ) into v_should_sample;
  end if;

  if v_should_sample then
    insert into public.operational_probe_history (
      component_key, probe_key, status, component_state, latency_ms,
      evidence_json, deployment_id, commit_sha, checked_at
    ) values (
      p_component_key, p_probe_key, p_status, v_new_state, p_latency_ms,
      coalesce(p_evidence, '{}'::jsonb), p_deployment_id, p_commit_sha, v_now
    );
  end if;

  return query select v_check_id, v_new_state, v_successes, v_failures;
end;
$$;

create or replace function public.fn_operational_retention_cleanup(
  p_probe_history_days integer default 30,
  p_incident_update_days integer default 365,
  p_delivery_days integer default 180,
  p_batch_limit integer default 500
)
returns table(table_name text, deleted_count integer)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_limit integer := greatest(coalesce(p_batch_limit, 500), 50);
  v_deleted integer := 0;
begin
  with alvo as (
    select id from public.operational_probe_history
    where checked_at < now() - make_interval(days => greatest(coalesce(p_probe_history_days, 30), 7))
      and status = 'ok'
    order by checked_at asc limit v_limit
  ), removidos as (
    delete from public.operational_probe_history where id in (select id from alvo) returning 1
  ) select count(*)::integer into v_deleted from removidos;
  table_name := 'operational_probe_history'; deleted_count := v_deleted; return next;

  with alvo as (
    select id from public.incident_updates
    where created_at < now() - make_interval(days => greatest(coalesce(p_incident_update_days, 365), 90))
      and public_visible = false
    order by created_at asc limit v_limit
  ), removidos as (
    delete from public.incident_updates where id in (select id from alvo) returning 1
  ) select count(*)::integer into v_deleted from removidos;
  table_name := 'incident_updates'; deleted_count := v_deleted; return next;

  with alvo as (
    select id from public.status_notification_deliveries
    where created_at < now() - make_interval(days => greatest(coalesce(p_delivery_days, 180), 30))
    order by created_at asc limit v_limit
  ), removidos as (
    delete from public.status_notification_deliveries where id in (select id from alvo) returning 1
  ) select count(*)::integer into v_deleted from removidos;
  table_name := 'status_notification_deliveries'; deleted_count := v_deleted; return next;
end;
$$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'operational_components',
    'operational_component_dependencies',
    'incident_updates',
    'operational_probe_history',
    'status_subscriptions',
    'status_notification_deliveries'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('revoke all on table public.%I from anon, authenticated', tbl);
    execute format('grant select, insert, update, delete on table public.%I to service_role', tbl);
  end loop;
end
$$;

revoke all on function public.fn_operational_observe_incident(text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb,boolean,text,text,text,integer) from public, anon, authenticated;
grant execute on function public.fn_operational_observe_incident(text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb,boolean,text,text,text,integer) to service_role;

revoke all on function public.fn_operational_record_probe(text,text,text,text,integer,integer,text,jsonb,text,text,integer,integer,integer,integer,text) from public, anon, authenticated;
grant execute on function public.fn_operational_record_probe(text,text,text,text,integer,integer,text,jsonb,text,text,integer,integer,integer,integer,text) to service_role;

revoke all on function public.fn_operational_retention_cleanup(integer,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.fn_operational_retention_cleanup(integer,integer,integer,integer) to service_role;
