create index if not exists cliente_app_migracao_tokens_conta_idx
  on public.cliente_app_migracao_tokens (conta_id)
  where conta_id is not null;

create index if not exists cliente_app_migracao_tokens_id_cliente_idx
  on public.cliente_app_migracao_tokens (id_cliente);

create index if not exists cliente_app_migracao_tokens_criado_por_idx
  on public.cliente_app_migracao_tokens (criado_por_usuario)
  where criado_por_usuario is not null;
