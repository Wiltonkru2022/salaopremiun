create index if not exists auditoria_logs_created_at_idx
  on public.auditoria_logs (created_at desc);

create index if not exists auditoria_logs_salao_created_at_idx
  on public.auditoria_logs (id_salao, created_at desc);

create index if not exists auditoria_logs_modulo_created_at_idx
  on public.auditoria_logs (modulo, created_at desc);

create index if not exists admin_master_auditoria_criado_em_idx
  on public.admin_master_auditoria (criado_em desc);

create index if not exists admin_master_auditoria_admin_criado_em_idx
  on public.admin_master_auditoria (id_admin_usuario, criado_em desc);
