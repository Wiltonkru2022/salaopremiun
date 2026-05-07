create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create schema if not exists private;

create or replace function private.processar_notificacoes_salaopremiun_cron()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
  v_request_id bigint;
begin
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
  when others then
    null;
end $$;

select cron.schedule(
  'processar-notificacoes-salaopremiun',
  '*/5 * * * *',
  $$select private.processar_notificacoes_salaopremiun_cron();$$
);
