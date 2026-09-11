create index if not exists clientes_app_auth_telefone_idx
  on public.clientes_app_auth (telefone)
  where telefone is not null;

create index if not exists clientes_telefone_salao_idx
  on public.clientes (telefone, id_salao)
  where telefone is not null;

create index if not exists clientes_whatsapp_salao_idx
  on public.clientes (whatsapp, id_salao)
  where whatsapp is not null;

create index if not exists clientes_auth_app_status_idx
  on public.clientes_auth (id_salao, id_cliente, app_conta_id)
  where app_conta_id is not null and app_ativo = true;
