create index if not exists assinaturas_saloes_id_plano_idx
  on public.assinaturas_saloes (id_plano);

create index if not exists assinaturas_saloes_id_salao_idx
  on public.assinaturas_saloes (id_salao);

create index if not exists campanhas_criado_por_idx
  on public.campanhas (criado_por)
  where criado_por is not null;

create index if not exists clientes_historico_id_cliente_idx
  on public.clientes_historico (id_cliente);

create index if not exists clientes_historico_id_profissional_idx
  on public.clientes_historico (id_profissional)
  where id_profissional is not null;

create index if not exists clientes_historico_id_salao_idx
  on public.clientes_historico (id_salao);

create index if not exists comissao_lancamentos_id_assistente_idx
  on public.comissao_lancamentos (id_assistente)
  where id_assistente is not null;

create index if not exists comissao_lancamentos_id_comanda_idx
  on public.comissao_lancamentos (id_comanda)
  where id_comanda is not null;

create index if not exists comissao_lancamentos_id_comanda_item_idx
  on public.comissao_lancamentos (id_comanda_item)
  where id_comanda_item is not null;

create index if not exists comissao_lancamentos_id_profissional_idx
  on public.comissao_lancamentos (id_profissional)
  where id_profissional is not null;

create index if not exists comissao_lancamentos_id_salao_idx
  on public.comissao_lancamentos (id_salao);

create index if not exists estoque_movimentacoes_id_agendamento_idx
  on public.estoque_movimentacoes (id_agendamento)
  where id_agendamento is not null;

create index if not exists estoque_movimentacoes_id_comanda_idx
  on public.estoque_movimentacoes (id_comanda)
  where id_comanda is not null;

create index if not exists estoque_movimentacoes_id_comanda_item_idx
  on public.estoque_movimentacoes (id_comanda_item)
  where id_comanda_item is not null;

create index if not exists estoque_movimentacoes_id_item_extra_idx
  on public.estoque_movimentacoes (id_item_extra)
  where id_item_extra is not null;

create index if not exists estoque_movimentacoes_id_produto_idx
  on public.estoque_movimentacoes (id_produto)
  where id_produto is not null;

create index if not exists estoque_movimentacoes_id_salao_idx
  on public.estoque_movimentacoes (id_salao);

create index if not exists estoque_movimentacoes_id_servico_idx
  on public.estoque_movimentacoes (id_servico)
  where id_servico is not null;

create index if not exists profissionais_id_profissional_principal_idx
  on public.profissionais (id_profissional_principal)
  where id_profissional_principal is not null;

create index if not exists profissionais_id_salao_idx
  on public.profissionais (id_salao)
  where id_salao is not null;

create index if not exists profissionais_vales_id_movimentacao_idx
  on public.profissionais_vales (id_movimentacao)
  where id_movimentacao is not null;

create index if not exists profissionais_vales_id_sessao_idx
  on public.profissionais_vales (id_sessao)
  where id_sessao is not null;
