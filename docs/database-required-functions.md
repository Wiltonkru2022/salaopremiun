# Funcoes Obrigatorias Do Banco

Antes de publicar em producao, valide que as migrations foram aplicadas e que as funcoes abaixo existem no schema `public`.

Use o healthcheck protegido do AdminMaster:

```http
GET /api/admin-master/saude/rpcs
```

Tambem rode:

```bash
npm run audit:database-contract
```

## Funcoes Criticas

- `fn_cadastrar_salao_transacional`
- `fn_salvar_servico_catalogo_transacional`
- `fn_get_or_create_servico_categoria`
- `fn_excluir_servico_catalogo`
- `fn_excluir_produto_catalogo`
- `fn_caixa_abrir_sessao`
- `fn_caixa_fechar_sessao`
- `fn_caixa_lancar_movimentacao_v2` ou `fn_caixa_lancar_movimentacao_idempotente`
- `fn_caixa_adicionar_pagamento_v2` ou `fn_caixa_adicionar_pagamento_comanda_idempotente`
- `fn_caixa_remover_pagamento` ou `fn_caixa_remover_pagamento_comanda`
- `fn_caixa_finalizar_comanda`
- `fn_caixa_cancelar_comanda`
- `fn_salvar_comanda_base`
- `fn_criar_comanda_por_agendamento`
- `fn_adicionar_item_comanda_idempotente` ou `fn_adicionar_item_comanda`
- `fn_atualizar_item_comanda`
- `fn_remover_item_comanda`
- `fn_enviar_comanda_para_pagamento`
- `fn_aplicar_estoque_comanda_atomic`
- `fn_processar_estoque_comanda_atomic`
- `fn_reverter_estoque_comanda_atomic`
- `fn_detalhes_venda`
- `fn_reabrir_venda_para_caixa`
- `fn_excluir_venda_completa`
- `fn_auth_user_id`
- `fn_usuario_atual`
- `fn_id_salao_atual`
- `fn_usuario_ativo`
- `fn_usuario_nivel`
- `fn_usuario_admin`
- `fn_usuario_mesmo_salao`
- `fn_shell_resumo_painel`
- `fn_validar_rls_critico`
- `fn_validar_funcoes_obrigatorias`

## Tabelas Criticas

- `admin_master_usuarios`
- `agenda_bloqueios`
- `agenda_bloqueios_logs`
- `agendamentos`
- `alertas_sistema`
- `asaas_webhook_eventos`
- `assinaturas`
- `assinaturas_cobrancas`
- `clientes`
- `comandas`
- `eventos_webhook`
- `logs_sistema`
- `planos_saas`
- `produtos`
- `profissionais`
- `servicos`
- `tickets`
- `usuarios`

## Checklist De Integridade

- Toda chamada `.rpc()` existente no codigo aparece em alguma migration.
- Toda funcao critica tem migration versionada.
- Toda tabela multi-tenant critica tem politica RLS revisada.
- Ambiente local, staging e producao estao com as mesmas migrations.
- AdminMaster consegue executar o healthcheck de RPCs antes da promocao.

Se esse healthcheck falhar, o deploy nao deve ser promovido.
