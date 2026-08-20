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
        timeout_milliseconds := 60000
      ) as request_id;
    $job$
  );
end
$$;
