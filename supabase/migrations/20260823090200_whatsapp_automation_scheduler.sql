do $$
declare
  v_secret text;
begin
  select decrypted_secret
    into v_secret
  from vault.decrypted_secrets
  where name = 'whatsapp_automation_worker_secret'
  order by created_at desc
  limit 1;

  if nullif(trim(coalesce(v_secret, '')), '') is null then
    perform vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'whatsapp_automation_worker_secret',
      'Segredo interno do worker automatico do WhatsApp'
    );
  end if;
end;
$$;

create or replace function public.fn_whatsapp_automation_secret_valid(p_secret text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from vault.decrypted_secrets
    where name = 'whatsapp_automation_worker_secret'
      and decrypted_secret = nullif(trim(coalesce(p_secret, '')), '')
  );
$$;

revoke all on function public.fn_whatsapp_automation_secret_valid(text) from public, anon, authenticated;
grant execute on function public.fn_whatsapp_automation_secret_valid(text) to service_role;

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

revoke all on function public.dispatch_whatsapp_automation_worker() from public, anon, authenticated;
grant execute on function public.dispatch_whatsapp_automation_worker() to service_role;

create or replace function public.enqueue_whatsapp_automatic_event(
  p_id_salao uuid,
  p_id_agendamento uuid,
  p_id_comanda uuid,
  p_evento text,
  p_idempotency_key text,
  p_payload_json jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
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
    payload_json
  ) values (
    p_id_salao,
    p_id_agendamento,
    p_id_comanda,
    p_evento,
    p_idempotency_key,
    coalesce(p_payload_json, '{}'::jsonb)
  )
  on conflict (idempotency_key) do nothing
  returning id into v_job_id;

  if v_job_id is not null then
    perform public.dispatch_whatsapp_automation_worker();
  end if;
end;
$$;

revoke all on function public.enqueue_whatsapp_automatic_event(uuid, uuid, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.enqueue_whatsapp_automatic_event(uuid, uuid, uuid, text, text, jsonb) to service_role;

do $$
declare
  v_jobid bigint;
begin
  select jobid
    into v_jobid
  from cron.job
  where jobname = 'whatsapp-automation-worker-15m'
  limit 1;

  if v_jobid is not null then
    perform cron.unschedule(v_jobid);
  end if;

  perform cron.schedule(
    'whatsapp-automation-worker-15m',
    '*/15 * * * *',
    'select public.dispatch_whatsapp_automation_worker();'
  );
end;
$$;
