export const SELECT_USUARIO_TENANT = "id, id_salao, nivel, status";
export const SELECT_SALAO_SHELL = "id, nome, responsavel, logo_url, plano, status";
export const SELECT_ASSINATURA_RESUMO = "status, plano, vencimento_em, trial_fim_em";
export const SELECT_TICKET_RESUMO =
  "id, numero, assunto, prioridade, status, ultima_interacao_em";
export const SELECT_ONBOARDING_RESUMO =
  "score_total, dias_com_acesso, modulos_usados, detalhes_json";
export const SELECT_SUPORTE_CONVERSA =
  "id, id_salao, id_profissional, origem_pagina, id_comanda, id_agendamento, id_cliente, titulo, atualizado_em";
export const SELECT_SUPORTE_MENSAGEM = "id, papel, conteudo, metadados, criado_em";
export const SELECT_PROFISSIONAL_RESUMO =
  "id, nome, nome_exibicao, categoria, cargo, ativo";
export const SELECT_AGENDAMENTO_RESUMO =
  "id, data, hora_inicio, hora_fim, status, cliente_id, servico_id, id_comanda";
export const SELECT_AGENDAMENTO_DETALHE =
  "id, data, hora_inicio, hora_fim, status, cliente_id, servico_id, id_comanda, observacoes, duracao_minutos";
export const SELECT_COMANDA_RESUMO =
  "id, numero, status, subtotal, desconto, acrescimo, total, id_cliente";
export const SELECT_CLIENTE_IA_SAFE = "id, nome";
export const SELECT_COMANDA_TOTAL = "total, status, fechada_em";
export const SELECT_USUARIOS_PERMISSOES =
  "agenda_criar, agenda_editar, agenda_excluir, agenda_ver, caixa_fechar, caixa_operar, caixa_ver, clientes_criar, clientes_editar, clientes_excluir, clientes_ver, comandas_criar, comandas_editar, comandas_excluir, comandas_ver, comissoes_pagar, comissoes_ver, configuracoes_editar, configuracoes_ver, created_at, estoque_movimentar, estoque_ver, id, id_salao, id_usuario, produtos_criar, produtos_editar, produtos_excluir, produtos_ver, profissionais_criar, profissionais_editar, profissionais_excluir, profissionais_ver, relatorios_ver, servicos_criar, servicos_editar, servicos_excluir, servicos_ver, updated_at, vendas_excluir, vendas_reabrir, vendas_ver";
export const SELECT_VW_VENDAS_BUSCA =
  "aberta_em, acrescimo, cancelada_em, cliente_nome, desconto, fechada_em, formas_pagamento, id, id_cliente, id_salao, itens_descricoes, numero, profissionais_nomes, status, subtotal, total";
export const SELECT_AGENDAMENTOS =
  "cliente_id, created_at, data, duracao_minutos, hora_fim, hora_inicio, id, id_comanda, id_salao, observacoes, origem, profissional_id, servico_id, status, updated_at";
export const SELECT_ADMIN_MASTER_PERMISSOES =
  "assinaturas_ajustar, assinaturas_ver, atualizado_em, auditoria_ver, campanhas_editar, cobrancas_reprocessar, cobrancas_ver, comunicacao_ver, criado_em, dashboard_ver, feature_flags_editar, financeiro_ver, id, id_admin_master_usuario, notificacoes_editar, operacao_reprocessar, operacao_ver, planos_editar, produto_ver, recursos_editar, relatorios_ver, saloes_editar, saloes_entrar_como, saloes_ver, suporte_ver, tickets_editar, tickets_ver, usuarios_admin_editar, usuarios_admin_ver, whatsapp_editar, whatsapp_ver";
export const SELECT_SALOES =
  "bairro, cep, cidade, complemento, cpf_cnpj, created_at, email, endereco, estado, id, inscricao_estadual, limite_profissionais, limite_usuarios, logo_url, nome, nome_fantasia, numero, plano, razao_social, renovacao_automatica, responsavel, status, telefone, tipo_pessoa, trial_ativo, trial_fim_em, trial_inicio_em, updated_at, whatsapp";
export const SELECT_ASSINATURAS =
  "asaas_credit_card_brand, asaas_credit_card_last4, asaas_credit_card_token, asaas_credit_card_tokenized_at, asaas_customer_id, asaas_payment_id, asaas_subscription_id, asaas_subscription_status, created_at, forma_pagamento_atual, gateway, id, id_cobranca_atual, id_salao, limite_profissionais, limite_usuarios, pago_em, plano, referencia_atual, renovacao_automatica, status, trial_ativo, trial_fim_em, trial_inicio_em, updated_at, valor, vencimento_em";
export const SELECT_CONFIGURACOES_SALAO =
  "cor_primaria, created_at, desconta_taxa_profissional, dias_funcionamento, exigir_cliente_na_venda, hora_abertura, hora_fechamento, id, id_salao, intervalo_minutos, modo_compacto, permitir_reabrir_venda, repassa_taxa_cliente, taxa_credito_10x, taxa_credito_11x, taxa_credito_12x, taxa_credito_1x, taxa_credito_2x, taxa_credito_3x, taxa_credito_4x, taxa_credito_5x, taxa_credito_6x, taxa_credito_7x, taxa_credito_8x, taxa_credito_9x, taxa_maquininha_boleto, taxa_maquininha_credito, taxa_maquininha_debito, taxa_maquininha_outro, taxa_maquininha_pix, taxa_maquininha_transferencia, updated_at";
export const SELECT_PROFISSIONAIS =
  "ativo, bairro, bio, cargo, categoria, cep, cidade, comissao_percentual, comissao_produto_percentual, cor_agenda, cpf, data_admissao, data_nascimento, dias_trabalho, eh_assistente, email, endereco, especialidades, estado, foto, foto_url, id, id_profissional_principal, id_salao, nivel_acesso, nome, nome_exibicao, nome_social, numero, ordem_agenda, pausas, percentual_comissao_assistente, permite_comissao, pix_chave, pix_tipo, pode_usar_sistema, recebe_comissao, rg, status, telefone, tipo_profissional, tipo_vinculo, whatsapp";
export const SELECT_AGENDA_BLOQUEIOS =
  "created_at, data, hora_fim, hora_inicio, id, id_salao, motivo, profissional_id";
export const SELECT_CAIXA_SESSOES =
  "aberto_em, created_at, fechado_em, id, id_salao, id_usuario_abertura, id_usuario_fechamento, observacoes, status, updated_at, valor_abertura, valor_fechamento_informado";
export const SELECT_CAIXA_MOVIMENTACOES =
  "created_at, descricao, forma_pagamento, id, id_comanda, id_profissional, id_salao, id_sessao, id_usuario, idempotency_key, tipo, valor";
export const SELECT_SERVICOS =
  "ativo, atualizado_em, base_calculo, categoria, comissao_assistente_percentual, comissao_percentual, comissao_percentual_padrao, created_at, criado_em, custo_produto, desconta_taxa_maquininha, descricao, duracao, duracao_minutos, exige_avaliacao, gatilho_retorno_dias, id, id_categoria, id_salao, nome, pausa_minutos, preco, preco_minimo, preco_padrao, preco_variavel, recurso_nome, status, updated_at";
export const SELECT_PRODUTOS =
  "ativo, categoria, codigo_barras, comissao_revenda_percentual, created_at, custo_por_dose, custo_real, custos_extras, data_validade, destinacao, dose_padrao, estoque_atual, estoque_maximo, estoque_minimo, fornecedor_contato_nome, fornecedor_nome, fornecedor_telefone, fornecedor_whatsapp, foto_url, id, id_salao, linha, lote, marca, margem_lucro_percentual, nome, observacoes, prazo_medio_entrega_dias, preco_custo, preco_venda, quantidade_por_embalagem, sku, status, unidade_dose, unidade_medida, updated_at";
export const SELECT_ITENS_EXTRAS =
  "ativo, atualizado_em, categoria, comissao_percentual, comissionavel, controla_estoque, criado_em, custo, descricao, estoque_atual, estoque_minimo, id, id_salao, nome, preco_venda, unidade_medida";
export const SELECT_COMANDA_ITENS =
  "ativo, base_calculo_aplicada, comissao_assistente_percentual_aplicada, comissao_assistente_valor_aplicado, comissao_percentual_aplicada, comissao_valor_aplicado, created_at, custo_total, desconta_taxa_maquininha_aplicada, descricao, id, id_agendamento, id_assistente, id_comanda, id_item_extra, id_produto, id_profissional, id_salao, id_servico, idempotency_key, observacoes, origem, quantidade, tipo, tipo_item, updated_at, valor_total, valor_unitario";
export const SELECT_COMANDA_PAGAMENTOS =
  "created_at, forma_pagamento, id, id_comanda, id_movimentacao, id_salao, idempotency_key, observacoes, pago_em, parcelas, taxa, taxa_maquininha_percentual, taxa_maquininha_valor, valor";
export const SELECT_COMISSOES_LANCAMENTOS =
  "competencia, competencia_data, criado_em, descricao, id, id_agendamento, id_assistente, id_comanda, id_comanda_item, id_profissional, id_salao, observacoes, origem_percentual, pago_em, percentual, percentual_aplicado, status, tipo_destinatario, tipo_profissional, updated_at, valor_base, valor_comissao, valor_comissao_assistente";
export const SELECT_CLIENTES =
  "ativo, atualizado_em, bairro, cashback, cep, cidade, cpf, created_at, data_nascimento, deleted_at, email, endereco, estado, foto_url, id, id_salao, nome, nome_social, numero, observacoes, profissao, rua, status, telefone, whatsapp";
export const SELECT_CLIENTES_FICHA_TECNICA =
  "alergias, condicoes_couro_cabeludo_pele, created_at, gestante, historico_quimico, id, id_cliente, id_salao, lactante, observacoes_tecnicas, restricoes_quimicas, updated_at, uso_medicamentos";
export const SELECT_CLIENTES_PREFERENCIAS =
  "bebida_favorita, como_conheceu_salao, created_at, estilo_atendimento, frequencia_visitas, id, id_cliente, id_salao, preferencias_gerais, profissional_favorito_id, revistas_assuntos_preferidos, updated_at";
export const SELECT_CLIENTES_AUTORIZACOES =
  "autoriza_email_marketing, autoriza_uso_imagem, autoriza_whatsapp_marketing, created_at, data_aceite_lgpd, id, id_cliente, id_salao, observacoes_autorizacao, termo_lgpd_aceito, updated_at";
export const SELECT_CLIENTES_AUTH =
  "app_ativo, created_at, email, id, id_cliente, id_salao, reset_token, reset_token_expira_em, senha_hash, ultimo_login_em, updated_at";
export const SELECT_COMANDAS =
  "aberta_em, acrescimo, cancelada_em, created_at, desconto, fechada_em, id, id_agendamento_principal, id_cliente, id_salao, motivo_cancelamento, numero, observacoes, origem, status, subtotal, total, updated_at";
export const SELECT_PROFISSIONAL_SERVICOS =
  "ativo, base_calculo, comissao_assistente_percentual, comissao_percentual, created_at, desconta_taxa_maquininha, duracao_minutos, id, id_profissional, id_salao, id_servico, ordem, preco_personalizado, updated_at";
export const SELECT_PRODUTO_SERVICO_CONSUMO =
  "ativo, created_at, custo_estimado, id, id_produto, id_salao, id_servico, quantidade_consumo, unidade_medida, updated_at";
