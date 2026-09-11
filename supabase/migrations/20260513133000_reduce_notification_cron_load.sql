create extension if not exists pg_cron with schema extensions;

do $$
begin
  perform cron.unschedule('processar-notificacoes-salaopremiun');
exception
  when others then
    null;
end $$;

select cron.schedule(
  'processar-notificacoes-salaopremiun',
  '*/10 * * * *',
  $$select private.processar_notificacoes_salaopremiun_cron();$$
);

do $$
begin
  perform cron.unschedule('limpar-pg-net-salaopremiun');
exception
  when others then
    null;
end $$;

select cron.schedule(
  'limpar-pg-net-salaopremiun',
  '17 * * * *',
  $$
    delete from net._http_response
    where created < now() - interval '6 hours';
  $$
);
