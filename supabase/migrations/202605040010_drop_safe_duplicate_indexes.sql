drop index if exists public.idx_agendamentos_cliente;
drop index if exists public.idx_agendamentos_id_comanda;

drop index if exists public.idx_assinaturas_saloes_id_salao;
drop index if exists public.ix_assinaturas_status;
drop index if exists public.idx_assinaturas_cobrancas_id_salao;
drop index if exists public.ix_assinaturas_cobrancas_id_salao;
drop index if exists public.ix_assinaturas_cobrancas_status;

drop index if exists public.idx_auditoria_logs_created_at;

drop index if exists public.idx_clientes_id_salao;
drop index if exists public.idx_clientes_salao;
drop index if exists public.idx_clientes_hist_id_cliente;
drop index if exists public.idx_clientes_hist_id_salao;

drop index if exists public.idx_comanda_itens_comanda;
drop index if exists public.idx_comanda_itens_profissional;
drop index if exists public.idx_comanda_pagamentos_comanda;
drop index if exists public.idx_comandas_id_cliente;
drop index if exists public.idx_comandas_id_salao;

drop index if exists public.idx_comissao_lancamentos_id_salao;
drop index if exists public.idx_comissoes_lancamentos_comanda;
drop index if exists public.idx_comissoes_lancamentos_id_comanda;

drop index if exists public.idx_estoque_movimentacoes_salao;

drop index if exists public.idx_produto_servico_consumo_produto;
drop index if exists public.idx_produto_servico_consumo_salao;
drop index if exists public.idx_produto_servico_consumo_servico;
drop index if exists public.idx_produtos_id_salao;

drop index if exists public.idx_prof_assist_assist;
drop index if exists public.idx_prof_assist_prof;
drop index if exists public.idx_prof_assist_salao;

drop index if exists public.idx_servicos_id_salao;
drop index if exists public.idx_servicos_salao;

drop index if exists public.suporte_conversas_idx_1;
drop index if exists public.suporte_mensagens_idx_1;
