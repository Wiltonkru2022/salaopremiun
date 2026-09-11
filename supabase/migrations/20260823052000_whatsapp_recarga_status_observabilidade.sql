alter table public.whatsapp_creditos_recargas
  drop constraint if exists whatsapp_creditos_recargas_status_check;

alter table public.whatsapp_creditos_recargas
  add constraint whatsapp_creditos_recargas_status_check
  check (status in ('pendente', 'processando', 'pago', 'falhou', 'expirado', 'cancelado'));

alter table public.whatsapp_creditos_recargas
  add column if not exists erro_texto text,
  add column if not exists creditado_em timestamptz;

comment on column public.whatsapp_creditos_recargas.status is
  'pendente=aguardando pagamento; processando=pagamento confirmado e credito em processamento; pago=credito liberado; falhou=falha ao liberar credito; expirado/cancelado=pagamento nao concluido';
