# Mapa Operacional Do Sistema

Este documento transforma os modulos grandes do SalaoPremium em contratos de manutencao. Ele deve ser revisado antes de refatoracoes grandes e antes de release.

## Fluxo Oficial Da Operacao

1. `agendamento`: cria contexto de atendimento, profissional, cliente, horario e status.
2. `comanda`: representa consumo, servicos, produtos e itens extras.
3. `pagamento`: registra valor bruto, desconto, acrescimo, taxa, valor liquido e forma.
4. `fechamento`: congela a comanda e dispara efeitos.
5. `estoque`: baixa itens de forma idempotente, nunca duas vezes.
6. `comissao`: calcula origem da regra, base, taxa, profissional e assistente.
7. `log/notificacao`: registra evento tecnico e, quando util, transforma em sinal visivel para usuario ou AdminMaster.

## Contratos Por Dominio

### Agenda

- Estado visual deve refletir estado real do banco.
- Drag, resize e alteracao de horario precisam rollback visual em erro.
- Mudancas com efeito em comanda devem passar por servico/RPC transacional.
- Checklist: status, profissional, cliente, horario, duracao, bloqueio, comanda vinculada.

### Caixa

- UI nao deve calcular regra final sozinha.
- Taxas precisam deixar claro: repassada ao cliente, absorvida pela casa, bruto, liquido e efeito em comissao.
- Abertura, fechamento, sangria, reforco e vale precisam log auditavel.
- Checklist: sessao aberta, permissao, comanda, pagamento, total, restante, idempotencia.

### Comandas E Vendas

- Comanda e venda nao podem virar dois caminhos independentes para o mesmo ato.
- Fechamento bloqueia edicao que altere financeiro sem reabertura controlada.
- Total da UI deve vir da mesma regra do backend.
- Checklist: subtotal, desconto, acrescimo, itens, servicos, produtos, status, caixa, estoque.

### Servicos

- O formulario deve separar: dados gerais, agenda, preco, comissao, profissionais e consumo.
- Regra padrao e excecao por profissional precisam estar visualmente explicitas.
- Checklist: preco, custo, margem, base bruto/liquido, taxa, comissao profissional, assistente, consumo.

### Produtos E Estoque

- Produto nao e so cadastro: deve comunicar custo, venda, margem, estoque minimo e risco.
- Baixa por comanda deve ser idempotente.
- Checklist: entrada, saida, ajuste manual, origem, salao, historico, responsavel.

### Profissionais

- Profissional conecta agenda, comissao, caixa, app profissional e acesso.
- Regras de comissao precisam declarar quem manda: servico, excecao do vinculo ou regra do profissional.
- Checklist: tipo, assistente, cor, agenda, pix, acesso, ativo/inativo.

### Clientes

- Cliente deve carregar historico operacional, nao apenas cadastro.
- Cadastro deve normalizar telefone/email e impedir duplicidade relevante por salao.
- Checklist: origem, contato, recorrencia, preferencias, historico, notificacao.

### Assinatura, Webhook E Cron

- Webhook e fonte primaria de atualizacao comercial externa.
- Cron deve reconciliar estados, com idempotencia e logs.
- Checkout precisa reutilizar cobranca pendente quando aplicavel.
- Checklist: plano, valor, vencimento, customer Asaas, token/cartao, Pix, boleto, webhook, status do salao.

### AdminMaster

- Toda acao precisa indicar efeito real, permissao e log.
- Saude precisa verificar RPC, webhook, cron, migrations, assinatura inconsistente e dominio.
- Checklist: botao com acao real, endpoint existente, guard, log, feedback visual.

### App Profissional

- Deve usar sessao propria e escopo estrito de `id_salao` e `id_profissional`.
- Faturamento precisa bater com comanda, fechamento e comissao.
- Checklist: agenda do dia, comissoes, tickets, clientes permitidos, suporte.

## Padrao De Notificacao

Todo evento visivel deve declarar:

- `event`: nome estavel do evento.
- `severity`: `info`, `success`, `warning`, `danger` ou `critical`.
- `persistence`: temporario ou persistente.
- `expiresAt`: quando deixa de aparecer.
- `actionHref`: destino ao clicar.
- `icon`: identificador visual.
- `audience`: usuario final, profissional, admin do salao ou AdminMaster.

Eventos obrigatorios: cliente cadastrado, profissional cadastrado, produto cadastrado, servico cadastrado, estoque baixo, caixa aberto, caixa fechado, agenda pendente, assinatura vencendo, webhook falho e evento critico do sistema.
