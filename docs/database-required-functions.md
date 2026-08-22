# Contrato do Banco — Funções e Tabelas Críticas

Antes de promover produção, valide que migrations e RPCs usadas pelo código existem no schema remoto.

```bash
npm run audit:database-contract
```

Healthcheck protegido do Admin Master:

```http
GET /api/admin-master/saude/rpcs
```

## Funções críticas

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

A lista deve acompanhar o auditor do banco. Se o código começar a depender de nova RPC crítica, atualize migration, auditor e este documento no mesmo PR.

## Tabelas críticas

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

## App Profissional Vite

O frontend profissional está em `apps/app-profissional-vite`, mas o contrato de banco continua server-side. O Vite não deve ganhar acesso privilegiado para substituir APIs/RPCs protegidas.

## Migrations de features removidas

Migration aplicada é histórico. A remoção do editor de imagens não autoriza apagar `20260519210000_editor_ecossistema.sql`. Se o schema do editor precisar ser removido, crie nova migration de `DROP` revisada e com backup.

## Checklist

- [ ] `.rpc()` usada pelo código possui migration/contrato;
- [ ] ambiente local/staging/produção usam a mesma sequência de migrations;
- [ ] tabelas multi-tenant críticas possuem RLS/policies revisadas;
- [ ] funções `SECURITY DEFINER` possuem `EXECUTE` mínimo necessário;
- [ ] Service Role não chega aos clientes;
- [ ] App Cliente e App Profissional não conseguem cruzar salões;
- [ ] healthcheck do Admin Master passa.

Se o contrato falhar, o release não deve ser promovido.