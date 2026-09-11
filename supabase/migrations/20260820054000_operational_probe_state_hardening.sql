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
returns table(check_id uuid, component_state text, consecutive_successes integer, consecutive_failures integer)
language plpgsql
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
  v_disabled boolean := false;
  v_usage boolean := false;
  v_active_push integer := 0;
  v_failing_push integer := 0;
  v_timeout_failure boolean := false;
  v_effective_failures_to_degrade integer := 2;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_component_key || ':' || p_probe_key, 0));

  -- O estado do Database é escrito somente pelo heartbeat interno do PostgreSQL.
  if p_component_key = 'supabase.database'
     and coalesce(p_probe_version, '') <> 'db-heartbeat-v1' then
    select h.id, c.estado_atual, coalesce(h.sucessos_consecutivos, 0), coalesce(h.falhas_consecutivas, 0)
      into v_check_id, v_previous_state, v_successes, v_failures
    from public.operational_components c
    left join public.health_checks_sistema h on h.component_key = c.component_key
    where c.component_key = p_component_key
    order by h.atualizado_em desc nulls last
    limit 1;

    return query select v_check_id, coalesce(v_previous_state, 'unknown'), v_successes, v_failures;
    return;
  end if;

  -- Integrações opcionais só participam da disponibilidade quando há uso real.
  if p_component_key in ('integration.asaas.api', 'integration.asaas.webhooks') then
    select
      exists(
        select 1 from public.assinaturas a
        where coalesce(a.asaas_subscription_id, '') <> ''
           or coalesce(a.asaas_customer_id, '') <> ''
      )
      or exists(
        select 1 from public.asaas_webhook_eventos w
        where w.ultimo_recebido_em >= v_now - interval '30 days'
      )
    into v_usage;

    if not v_usage then
      v_disabled := true;
      p_status := 'unknown';
      p_score := 0;
      p_motivo := 'Integração opcional desativada: nenhum vínculo Asaas ativo e nenhum webhook recente.';
    end if;
  elsif p_component_key = 'communication.whatsapp' then
    select
      exists(
        select 1 from public.whatsapp_pacote_saloes p
        where lower(coalesce(p.status, '')) in ('ativo', 'active')
          and (p.expira_em is null or p.expira_em >= v_now)
      )
      or exists(
        select 1 from public.whatsapp_envios e
        where e.criado_em >= v_now - interval '30 days'
      )
      or exists(
        select 1 from public.whatsapp_filas f
        where f.criado_em >= v_now - interval '30 days'
      )
    into v_usage;

    if not v_usage then
      v_disabled := true;
      p_status := 'unknown';
      p_score := 0;
      p_motivo := 'Integração opcional desativada: não há pacote, fila ou envio WhatsApp em uso.';
    end if;
  elsif p_component_key = 'integration.google_calendar' then
    select exists(
      select 1 from public.saloes_google_calendar_connections g
      where g.ativo = true
    ) into v_usage;

    if not v_usage then
      v_disabled := true;
      p_status := 'unknown';
      p_score := 0;
      p_motivo := 'Integração opcional desativada: nenhum salão possui conexão Google Calendar ativa.';
    end if;
  elsif p_component_key = 'communication.brevo'
        and coalesce(p_evidence ->> 'configured', 'false') <> 'true' then
    v_disabled := true;
    p_status := 'unknown';
    p_score := 0;
    p_motivo := 'Integração de e-mail desativada neste deployment: BREVO_API_KEY ausente.';
  end if;

  if v_disabled then
    p_evidence := coalesce(p_evidence, '{}'::jsonb)
      || jsonb_build_object('disabled', true, 'activation', 'standby');
  end if;

  -- Push: expira subscriptions inválidas e mede somente endpoints ainda ativos.
  if p_component_key in ('client.push', 'professional.push', 'communication.push_vapid') then
    update public.push_subscriptions
    set ativo = false,
        last_error_message = case
          when last_error_code = 400 and endpoint like 'https://web.push.apple.com/%'
            then 'Apple Web Push HTTP 400 recorrente; subscription desativada para novo registro pelo dispositivo.'
          else last_error_message
        end,
        updated_at = v_now
    where ativo = true
      and (
        last_error_code in (404, 410)
        or (
          last_error_code = 400
          and failure_count >= 2
          and endpoint like 'https://web.push.apple.com/%'
        )
      );

    select
      count(*)::int,
      count(*) filter (
        where coalesce(s.failure_count, 0) > 0
          and s.last_failure_at >= v_now - interval '24 hours'
      )::int
    into v_active_push, v_failing_push
    from public.push_subscriptions s
    where s.ativo = true
      and (
        p_component_key = 'communication.push_vapid'
        or (p_component_key = 'client.push' and s.audience = 'cliente_app')
        or (p_component_key = 'professional.push' and s.audience = 'profissional_app')
      );

    if v_active_push = 0 then
      v_disabled := true;
      p_status := 'unknown';
      p_score := 0;
      p_motivo := 'Web Push em standby: não há subscriptions ativas para esta audiência.';
      p_evidence := coalesce(p_evidence, '{}'::jsonb)
        || jsonb_build_object('disabled', true, 'activeSubscriptions', 0);
    elsif v_failing_push = 0 then
      p_status := 'ok';
      p_score := 100;
      p_motivo := 'Subscriptions Web Push ativas sem falha recente; endpoints expirados foram removidos da disponibilidade.';
      p_evidence := coalesce(p_evidence, '{}'::jsonb)
        || jsonb_build_object('disabled', false, 'activeSubscriptions', v_active_push, 'failingActiveSubscriptions', 0);
    else
      p_status := 'warning';
      p_score := greatest(55, 100 - ((v_failing_push::numeric / greatest(v_active_push, 1)) * 100)::int);
      p_motivo := format('%s de %s subscription(s) ativa(s) têm falha recente.', v_failing_push, v_active_push);
      p_evidence := coalesce(p_evidence, '{}'::jsonb)
        || jsonb_build_object('disabled', false, 'activeSubscriptions', v_active_push, 'failingActiveSubscriptions', v_failing_push);
    end if;
  end if;

  -- Timeout sintético isolado é degradação; outage grave exige erro explícito.
  v_timeout_failure := p_motivo = 'probe_timeout';
  if p_status = 'critical' and v_timeout_failure then
    p_status := 'warning';
    p_score := greatest(coalesce(p_score, 0), 50);
    p_motivo := 'Timeout do probe sintético; tratado como degradação até existir evidência explícita de indisponibilidade.';
    p_evidence := coalesce(p_evidence, '{}'::jsonb) || jsonb_build_object('timeout', true);
  end if;

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

  v_effective_failures_to_degrade := greatest(
    coalesce(p_falhas_para_degradar, 2),
    case when v_timeout_failure then 2 else 1 end
  );

  if p_status = 'unknown' then
    v_new_state := 'unknown';
  elsif p_status = 'ok' and v_successes >= greatest(coalesce(p_sucessos_para_recuperar, 3), 1) then
    v_new_state := 'operational';
  elsif p_status = 'critical' and v_failures >= v_effective_failures_to_degrade then
    v_new_state := case
      when v_criticality = 'critical' then 'major_outage'
      when v_criticality = 'high' then 'partial_outage'
      else 'degraded'
    end;
  elsif p_status = 'warning' and v_failures >= v_effective_failures_to_degrade then
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
