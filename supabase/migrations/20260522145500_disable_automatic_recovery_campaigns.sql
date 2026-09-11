update public.cupons_salao
set
  ativo = false,
  status_campanha = 'pausada',
  updated_at = now(),
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'automatico_recuperacao_desativado_em',
    now()
  )
where automatico_recuperacao = true;

update public.notification_jobs
set
  status = 'cancelada',
  updated_at = now(),
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'motivo_cancelamento',
    'Campanhas automaticas de recuperacao foram desativadas.'
  )
where tipo in ('cliente_inativo_cupom_saudades', 'cupom_recebido_cliente')
  and status in ('pendente', 'processando');
