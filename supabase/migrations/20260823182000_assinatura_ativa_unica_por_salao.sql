create unique index if not exists assinaturas_salao_ativa_unica_uidx
  on public.assinaturas (id_salao)
  where status in ('teste_gratis','ativo');
