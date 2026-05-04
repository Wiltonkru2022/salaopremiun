create index if not exists admin_master_auditoria_id_admin_usuario_idx
  on public.admin_master_auditoria (id_admin_usuario);

create index if not exists admin_master_salao_tags_id_tag_idx
  on public.admin_master_salao_tags (id_tag);

create index if not exists tickets_id_responsavel_admin_idx
  on public.tickets (id_responsavel_admin);

create index if not exists ticket_mensagens_id_admin_usuario_idx
  on public.ticket_mensagens (id_admin_usuario);

create index if not exists ticket_mensagens_id_usuario_salao_idx
  on public.ticket_mensagens (id_usuario_salao);

create index if not exists ticket_mensagens_id_profissional_idx
  on public.ticket_mensagens (id_profissional);

create index if not exists notificacoes_destinos_id_salao_idx
  on public.notificacoes_destinos (id_salao);

create index if not exists campanha_destinos_id_salao_idx
  on public.campanha_destinos (id_salao);

create index if not exists whatsapp_pacote_saloes_id_pacote_idx
  on public.whatsapp_pacote_saloes (id_pacote);

create index if not exists whatsapp_envios_id_salao_idx
  on public.whatsapp_envios (id_salao);

create index if not exists whatsapp_filas_id_salao_idx
  on public.whatsapp_filas (id_salao);

create index if not exists feature_flag_saloes_id_salao_idx
  on public.feature_flag_saloes (id_salao);

create index if not exists configuracoes_globais_atualizado_por_idx
  on public.configuracoes_globais (atualizado_por);

create index if not exists configuracoes_globais_historico_atualizado_por_idx
  on public.configuracoes_globais_historico (atualizado_por);

create index if not exists logs_sistema_id_usuario_idx
  on public.logs_sistema (id_usuario);

create index if not exists reprocessamentos_sistema_id_admin_usuario_idx
  on public.reprocessamentos_sistema (id_admin_usuario);

create index if not exists checklists_salao_id_checklist_item_idx
  on public.checklists_salao (id_checklist_item);

create index if not exists eventos_sistema_id_usuario_idx
  on public.eventos_sistema (id_usuario);

create index if not exists eventos_sistema_id_admin_usuario_idx
  on public.eventos_sistema (id_admin_usuario);

create index if not exists suporte_conversas_id_comanda_idx
  on public.suporte_conversas (id_comanda);

create index if not exists suporte_conversas_id_cliente_idx
  on public.suporte_conversas (id_cliente);
