insert into public.whatsapp_tarifas (
  tipo_interno,
  categoria_meta,
  nome,
  descricao,
  custo_base_meta_centavos,
  preco_venda_centavos,
  ativo,
  ordem
) values (
  'profissional_confirmado',
  'utility',
  'Profissional confirmado',
  'Confirma ao cliente quem realizará o atendimento.',
  4,
  6,
  true,
  45
)
on conflict (tipo_interno) do update set
  categoria_meta = excluded.categoria_meta,
  nome = excluded.nome,
  descricao = excluded.descricao,
  custo_base_meta_centavos = excluded.custo_base_meta_centavos,
  preco_venda_centavos = excluded.preco_venda_centavos,
  ativo = excluded.ativo,
  ordem = excluded.ordem,
  atualizado_em = timezone('utc', now());

update public.whatsapp_templates
set
  tipo_interno = 'profissional_confirmado',
  categoria_meta = 'utility',
  atualizado_em = timezone('utc', now())
where lower(coalesce(nome_meta, '')) = 'profissional_confirmado';
