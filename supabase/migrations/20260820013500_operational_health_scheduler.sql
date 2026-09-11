create table if not exists public.operational_scheduler_auth (
  scheduler_key text primary key,
  token_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduler_key = 'operational-health')
);

alter table public.operational_scheduler_auth enable row level security;
revoke all on table public.operational_scheduler_auth from anon, authenticated;
grant select, insert, update, delete on table public.operational_scheduler_auth to service_role;

do $$
declare
  v_token text;
begin
  select decrypted_secret
    into v_token
  from vault.decrypted_secrets
  where name = 'operational_health_scheduler_token'
  order by created_at desc
  limit 1;

  if coalesce(v_token, '') = '' then
    v_token := encode(gen_random_bytes(32), 'hex');
    perform vault.create_secret(
      v_token,
      'operational_health_scheduler_token',
      'Token interno para o Supabase Cron acionar a Saúde Operacional do SalãoPremium.'
    );
  end if;

  insert into public.operational_scheduler_auth (
    scheduler_key,
    token_hash,
    updated_at
  ) values (
    'operational-health',
    encode(digest(v_token, 'sha256'), 'hex'),
    now()
  )
  on conflict (scheduler_key) do update
    set token_hash = excluded.token_hash,
        updated_at = excluded.updated_at;
end
$$;

do $$
declare
  v_job_id bigint;
begin
  select jobid
    into v_job_id
  from cron.job
  where jobname = 'salaopremium-operational-health-10m'
  limit 1;

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'salaopremium-operational-health-10m',
    '*/10 * * * *',
    $job$
      select net.http_post(
        url := 'https://salaopremiun.com.br/api/cron/operational-health',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'operational_health_scheduler_token'
            order by created_at desc
            limit 1
          )
        ),
        body := jsonb_build_object(
          'source', 'supabase-cron',
          'scheduled_at', now()
        ),
        timeout_milliseconds := 15000
      ) as request_id;
    $job$
  );
end
$$;
