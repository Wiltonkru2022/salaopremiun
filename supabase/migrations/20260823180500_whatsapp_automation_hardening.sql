-- Endurece as automacoes WhatsApp para cobrir todos os fluxos de agenda,
-- desacoplar lembretes do push, recuperar jobs travados e preservar cancelamentos.

alter table public.whatsapp_automatic_jobs
  drop constraint if exists whatsapp_automatic_jobs_evento_check;

alter table public.whatsapp_automatic_jobs
  add constraint whatsapp_automatic_jobs_evento_check
  check (evento in (
    'confirmacao_agendamento',
    'lembrete_agendamento',
    'agendamento_alterado',
    'agendamento_cancelado',
    'profissional_confirmado',
    'pagamento_confirmado'
  ));

create index if not exists whatsapp_automatic_jobs_processing_watchdog_idx
  on public.whatsapp_automatic_jobs (atualizado_em)
  where status = 'processando';

create or replace function public.fn_whatsapp_automation_recover_stuck_jobs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requeued integer := 0;
  v_failed integer := 0;
begin
  update public.whatsapp_automatic_jobs
     set status = 'falhou',
         erro_texto = coalesce(nullif(erro_texto, ''), 'Job automatico excedeu o limite de tentativas.'),
         processado_em = timezone('utc', now()),
         atualizado_em = timezone('utc', now())
   where status = 'processando'
     and atualizado_em < timezone('utc', now()) - interval '10 minutes'
     and tentativas >= 3;
  get diagnostics v_failed = row_count;

  update public.whatsapp_automatic_jobs
     set status = 'pendente',
         enviar_em = least(enviar_em, timezone('utc', now())),
         erro_texto = 'Job recuperado automaticamente apos interrupcao do worker.',
         processado_em = null,
         atualizado_em = timezone('utc', now())
   where status = 'processando'
     and atualizado_em < timezone('utc', now()) - interval '10 minutes'
     and tentativas < 3;
  get diagnostics v_requeued = row_count;

  return v_requeued + v_failed;
end;
$$;

revoke all on function public.fn_whatsapp_automation_recover_stuck_jobs() from public, anon, authenticated;
grant execute on function public.fn_whatsapp_automation_recover_stuck_jobs() to service_role;

create or replace function public.fn_whatsapp_reminder_send_at(
  p_id_salao uuid,
  p_data date,
  p_hora time
)
returns timestamptz
language plpgsql
stable
set search_path = public
as $$
declare
  v_timezone text := 'America/Campo_Grande';
  v_minutes integer := 30;
begin
  select coalesce(nullif(trim(cs.fuso_horario), ''), v_timezone)
    into v_timezone
    from public.configuracoes_salao cs
   where cs.id_salao = p_id_salao
   limit 1;

  if not exists (select 1 from pg_timezone_names where name = v_timezone) then
    v_timezone := 'America/Campo_Grande';
  end if;

  select least(greatest(coalesce(cn.lembrete_minutos_antes, 30), 5), 240)
    into v_minutes
    from public.configuracoes_notificacoes cn
   where cn.id_salao = p_id_salao
   limit 1;

  v_minutes := coalesce(v_minutes, 30);

  return ((p_data + p_hora) at time zone v_timezone) - make_interval(mins => v_minutes);
end;
$$;

revoke all on function public.fn_whatsapp_reminder_send_at(uuid, date, time) from public, anon, authenticated;
grant execute on function public.fn_whatsapp_reminder_send_at(uuid, date, time) to service_role;

create or replace function public.enqueue_whatsapp_automatic_event_at(
  p_id_salao uuid,
  p_id_agendamento uuid,
  p_id_comanda uuid,
  p_evento text,
  p_idempotency_key text,
  p_enviar_em timestamptz,
  p_payload_json jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
  v_send_at timestamptz := coalesce(p_enviar_em, timezone('utc', now()));
begin
  if p_id_salao is null or nullif(trim(coalesce(p_idempotency_key, '')), '') is null then
    return;
  end if;

  insert into public.whatsapp_automatic_jobs (
    id_salao,
    id_agendamento,
    id_comanda,
    evento,
    idempotency_key,
    enviar_em,
    payload_json
  ) values (
    p_id_salao,
    p_id_agendamento,
    p_id_comanda,
    p_evento,
    p_idempotency_key,
    v_send_at,
    coalesce(p_payload_json, '{}'::jsonb)
  )
  on conflict (idempotency_key) do nothing
  returning id into v_job_id;

  if v_job_id is not null and v_send_at <= timezone('utc', now()) + interval '30 seconds' then
    perform public.dispatch_whatsapp_automation_worker();
  end if;
end;
$$;

revoke all on function public.enqueue_whatsapp_automatic_event_at(uuid, uuid, uuid, text, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.enqueue_whatsapp_automatic_event_at(uuid, uuid, uuid, text, text, timestamptz, jsonb) to service_role;

create or replace function public.fn_whatsapp_schedule_appointment_reminder(
  p_id_salao uuid,
  p_id_agendamento uuid,
  p_id_comanda uuid,
  p_data date,
  p_hora time
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_send_at timestamptz;
  v_key text;
begin
  delete from public.whatsapp_automatic_jobs
   where id_salao = p_id_salao
     and id_agendamento = p_id_agendamento
     and evento = 'lembrete_agendamento'
     and status = 'pendente';

  v_send_at := public.fn_whatsapp_reminder_send_at(p_id_salao, p_data, p_hora);
  if v_send_at <= timezone('utc', now()) then
    return;
  end if;

  v_key := 'auto:lembrete:' || p_id_agendamento::text || ':' || encode(digest(
    coalesce(p_data::text, '') || '|' || coalesce(p_hora::text, '') || '|' || coalesce(v_send_at::text, ''),
    'sha256'
  ), 'hex');

  perform public.enqueue_whatsapp_automatic_event_at(
    p_id_salao,
    p_id_agendamento,
    p_id_comanda,
    'lembrete_agendamento',
    v_key,
    v_send_at,
    jsonb_build_object('source', 'agendamento_confirmado', 'scheduled_for', v_send_at)
  );
end;
$$;

revoke all on function public.fn_whatsapp_schedule_appointment_reminder(uuid, uuid, uuid, date, time) from public, anon, authenticated;
grant execute on function public.fn_whatsapp_schedule_appointment_reminder(uuid, uuid, uuid, date, time) to service_role;

create or replace function public.trg_agendamento_whatsapp_automatic_events()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_event_id text := gen_random_uuid()::text;
  v_status text := lower(coalesce(new.status, ''));
  v_old_status text := case when tg_op = 'UPDATE' then lower(coalesce(old.status, '')) else '' end;
  v_schedule_changed boolean := false;
  v_prof_changed boolean := false;
  v_prof_new boolean := false;
begin
  if tg_op = 'INSERT' then
    if v_status = 'confirmado' then
      perform public.enqueue_whatsapp_automatic_event(
        new.id_salao, new.id, new.id_comanda, 'confirmacao_agendamento',
        'auto:confirmacao:' || new.id::text || ':' || v_event_id,
        jsonb_build_object('source', 'agendamentos_insert')
      );
      perform public.fn_whatsapp_schedule_appointment_reminder(
        new.id_salao, new.id, new.id_comanda, new.data, new.hora_inicio::time
      );
    end if;
    return new;
  end if;

  if v_status = 'cancelado' and v_old_status <> 'cancelado' then
    delete from public.whatsapp_automatic_jobs
     where id_salao = new.id_salao
       and id_agendamento = new.id
       and evento = 'lembrete_agendamento'
       and status = 'pendente';

    perform public.enqueue_whatsapp_automatic_event(
      new.id_salao, new.id, new.id_comanda, 'agendamento_cancelado',
      'auto:cancelamento:' || new.id::text || ':' || v_event_id,
      jsonb_build_object('source', 'agendamentos_status')
    );
    return new;
  end if;

  v_schedule_changed :=
    new.data is distinct from old.data
    or new.hora_inicio is distinct from old.hora_inicio
    or new.servico_id is distinct from old.servico_id;
  v_prof_changed := new.profissional_id is distinct from old.profissional_id;
  v_prof_new := old.profissional_id is null and new.profissional_id is not null;

  if v_status = 'confirmado' and v_old_status <> 'confirmado' then
    perform public.enqueue_whatsapp_automatic_event(
      new.id_salao, new.id, new.id_comanda, 'confirmacao_agendamento',
      'auto:confirmacao:' || new.id::text || ':' || v_event_id,
      jsonb_build_object('source', 'agendamentos_status')
    );
    perform public.fn_whatsapp_schedule_appointment_reminder(
      new.id_salao, new.id, new.id_comanda, new.data, new.hora_inicio::time
    );
  elsif v_status = 'confirmado' and (v_schedule_changed or v_prof_changed) then
    perform public.fn_whatsapp_schedule_appointment_reminder(
      new.id_salao, new.id, new.id_comanda, new.data, new.hora_inicio::time
    );
  elsif v_status <> 'confirmado' and (v_schedule_changed or v_prof_changed) then
    delete from public.whatsapp_automatic_jobs
     where id_salao = new.id_salao
       and id_agendamento = new.id
       and evento = 'lembrete_agendamento'
       and status = 'pendente';
  end if;

  if v_status not in ('cancelado', 'atendido', 'faltou', 'expirado') then
    if v_prof_new and not v_schedule_changed then
      perform public.enqueue_whatsapp_automatic_event(
        new.id_salao, new.id, new.id_comanda, 'profissional_confirmado',
        'auto:profissional-confirmado:' || new.id::text || ':' || v_event_id,
        jsonb_build_object('source', 'agendamentos_profissional')
      );
    elsif v_schedule_changed or v_prof_changed then
      perform public.enqueue_whatsapp_automatic_event(
        new.id_salao, new.id, new.id_comanda, 'agendamento_alterado',
        'auto:alteracao:' || new.id::text || ':' || v_event_id,
        jsonb_build_object(
          'source', 'agendamentos_update',
          'old_data', old.data,
          'old_hora_inicio', old.hora_inicio,
          'old_profissional_id', old.profissional_id
        )
      );
    end if;
  end if;

  if lower(coalesce(new.sinal_status, '')) = 'confirmado'
     and lower(coalesce(old.sinal_status, '')) <> 'confirmado'
     and coalesce(new.sinal_valor, 0) > 0 then
    perform public.enqueue_whatsapp_automatic_event(
      new.id_salao, new.id, new.id_comanda, 'pagamento_confirmado',
      'auto:pagamento-sinal:' || new.id::text || ':' || gen_random_uuid()::text,
      jsonb_build_object('source', 'agendamento_sinal', 'valor', new.sinal_valor)
    );
  end if;

  return new;
end;
$$;

-- Preserva historico e garante que o job de cancelamento nao seja apagado por ON DELETE CASCADE.
create or replace function public.trg_preserve_canceled_appointment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if lower(coalesce(old.status, '')) = 'cancelado' then
    return null;
  end if;
  return old;
end;
$$;

drop trigger if exists trg_preserve_canceled_appointment on public.agendamentos;
create trigger trg_preserve_canceled_appointment
before delete on public.agendamentos
for each row
execute function public.trg_preserve_canceled_appointment();

create or replace function public.trg_comanda_whatsapp_pagamento_confirmado()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if lower(coalesce(new.status, '')) = 'fechada'
     and lower(coalesce(old.status, '')) <> 'fechada'
     and new.id_cliente is not null
     and coalesce(new.total, 0) > 0 then
    perform public.enqueue_whatsapp_automatic_event(
      new.id_salao,
      new.id_agendamento_principal,
      new.id,
      'pagamento_confirmado',
      'auto:pagamento-comanda:' || new.id::text || ':' || gen_random_uuid()::text,
      jsonb_build_object('source', 'comanda_fechada', 'valor', new.total)
    );
  end if;
  return new;
end;
$$;

create or replace function public.dispatch_whatsapp_automation_worker()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
  v_request_id bigint;
begin
  perform public.fn_whatsapp_automation_recover_stuck_jobs();

  select decrypted_secret
    into v_secret
  from vault.decrypted_secrets
  where name = 'whatsapp_automation_worker_secret'
  order by created_at desc
  limit 1;

  if nullif(trim(coalesce(v_secret, '')), '') is null then
    raise exception 'Segredo do worker WhatsApp nao configurado.';
  end if;

  select net.http_post(
    url := 'https://salaopremiun.com.br/api/internal/whatsapp-automation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-whatsapp-automation-secret', v_secret
    ),
    body := jsonb_build_object(
      'source', 'supabase',
      'requested_at', timezone('utc', now())
    ),
    timeout_milliseconds := 15000
  ) into v_request_id;

  return v_request_id;
end;
$$;

-- Acorda o worker a cada 5 minutos: suficiente para lembretes sem polling agressivo.
do $$
declare
  v_job record;
begin
  for v_job in
    select jobid from cron.job where jobname in ('whatsapp-automation-worker-15m', 'whatsapp-automation-worker-5m')
  loop
    perform cron.unschedule(v_job.jobid);
  end loop;

  perform cron.schedule(
    'whatsapp-automation-worker-5m',
    '*/5 * * * *',
    'select public.dispatch_whatsapp_automation_worker();'
  );
end;
$$;
