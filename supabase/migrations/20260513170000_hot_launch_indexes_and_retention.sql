create index if not exists assinaturas_status_salao_idx
  on public.assinaturas (status, id_salao);

create index if not exists assinaturas_trial_fim_status_idx
  on public.assinaturas (trial_fim_em, status)
  where status in ('teste_gratis', 'trial');

create index if not exists assinaturas_cobrancas_status_created_idx
  on public.assinaturas_cobrancas (status, created_at desc);

create index if not exists assinaturas_cobrancas_expiracao_status_idx
  on public.assinaturas_cobrancas (data_expiracao, status);

create index if not exists saloes_status_created_idx
  on public.saloes (status, created_at desc);

create index if not exists logs_sistema_gravidade_criado_idx
  on public.logs_sistema (gravidade, criado_em desc);

create index if not exists logs_sistema_recent_errors_idx
  on public.logs_sistema (criado_em desc)
  where gravidade in ('warning', 'error', 'alta', 'critica', 'critical');

create index if not exists clientes_auth_app_ativo_conta_idx
  on public.clientes_auth (app_ativo, app_conta_id)
  where app_ativo = true and app_conta_id is not null;

create index if not exists clientes_salao_telefone_lookup_idx
  on public.clientes (id_salao, telefone, whatsapp);

create index if not exists eventos_sistema_recent_errors_idx
  on public.eventos_sistema (created_at desc, modulo)
  where sucesso = false or severidade in ('warning', 'error', 'critical');

create index if not exists incidentes_sistema_abertos_ultima_idx
  on public.incidentes_sistema (ultima_ocorrencia_em desc)
  where status <> 'resolvido';

create index if not exists notification_jobs_pending_send_idx
  on public.notification_jobs (enviar_em, status)
  where status = 'pendente';
