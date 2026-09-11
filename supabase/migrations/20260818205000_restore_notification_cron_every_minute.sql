create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  perform cron.unschedule('processar-notificacoes-salaopremiun');
exception
  when others then
    null;
end $$;

select cron.schedule(
  'processar-notificacoes-salaopremiun',
  '* * * * *',
  $$select private.processar_notificacoes_salaopremiun_cron();$$
);
