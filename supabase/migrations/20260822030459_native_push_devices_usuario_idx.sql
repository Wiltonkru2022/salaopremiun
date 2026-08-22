create index if not exists native_push_devices_usuario_idx
  on public.native_push_devices(id_usuario)
  where audience = 'salao_painel' and ativo = true;
