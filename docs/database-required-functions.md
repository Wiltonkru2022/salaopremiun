# Funções obrigatórias do banco

Antes de publicar em produção, valide que as migrations foram aplicadas e que
as funções abaixo existem no schema `public`.

Use o healthcheck protegido do Admin Master:

`GET /api/admin-master/saude/rpcs`

Funções críticas:

- `fn_cadastrar_salao_transacional`
- `fn_salvar_servico_catalogo_transacional`
- `fn_get_or_create_servico_categoria`
- `fn_excluir_servico_catalogo`
- `fn_excluir_produto_catalogo`
- `fn_caixa_abrir_sessao`
- `fn_caixa_fechar_sessao`
- `fn_caixa_lancar_movimentacao_v2`
- `fn_caixa_adicionar_pagamento_v2`
- `fn_caixa_remover_pagamento`
- `fn_caixa_finalizar_comanda`
- `fn_caixa_cancelar_comanda`
- `fn_salvar_comanda_base`
- `fn_comanda_adicionar_item_v2`
- `fn_comanda_atualizar_item`
- `fn_remover_item_comanda`
- `fn_aplicar_estoque_comanda`
- `fn_reverter_estoque_comanda`
- `fn_detalhes_venda`
- `fn_reabrir_venda_para_caixa`
- `fn_excluir_venda_completa`

Se esse healthcheck falhar, o deploy não deve ser promovido.
