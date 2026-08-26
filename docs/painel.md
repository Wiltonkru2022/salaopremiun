# Painel do Salão e Admin Master

## Painel do salão

A aplicação administrativa é Next.js e usa principalmente o route group `app/(painel)`, componentes compartilhados, APIs e serviços server-side.

Responsabilidades principais:

- dashboard;
- agenda;
- clientes;
- profissionais;
- serviços;
- produtos/estoque;
- comandas e vendas;
- caixa;
- comissões;
- relatórios;
- campanhas/cupons;
- assinatura;
- configurações e integrações.

## Regra multi-tenant

O Painel nunca deve confiar em um `id_salao` enviado livremente pelo navegador como autorização. O salão efetivo precisa vir do contexto autenticado e ser validado novamente no servidor.

Toda feature multi-tenant deve responder:

1. quem é o usuário?
2. a qual salão ele pertence?
3. está ativo?
4. possui nível/permissão para a ação?
5. o recurso consultado também pertence ao mesmo salão?

## Autenticação

O Painel utiliza Neon Auth associado à tabela `usuarios`. Operações administrativas sensíveis ficam no servidor e podem usar Service Role somente depois de autenticação, autorização e escopo de salão.

## Fluxo operacional

```text
Agenda
  ↓
Comanda
  ↓
Pagamento / Caixa
  ↓
Fechamento
  ├── Estoque
  ├── Comissão
  ├── Venda/financeiro
  └── Notificações/logs
```

Esses domínios não devem possuir regras financeiras diferentes em cada tela. A UI exibe o resultado da mesma regra usada no backend.

## Admin Master

O Admin Master vive em `app/(admin-master)` e possui contexto/guard próprio. É responsável por administração global e não deve reaproveitar permissões comuns de um salão como se fossem equivalentes.

Funções esperadas:

- salões e status;
- planos;
- assinaturas/cobranças;
- webhooks;
- tickets;
- saúde operacional;
- alertas/incidentes;
- segurança;
- relatórios globais;
- configurações administrativas.

Toda ação mutável do Admin Master deve ter:

- autenticação Admin Master;
- validação de entrada;
- log/auditoria;
- feedback de sucesso/erro;
- confirmação forte para ação destrutiva.

## UI e consistência

Painel, App Cliente e App Profissional podem ter linguagens visuais adaptadas ao público, mas devem compartilhar conceitos e estados:

- mesmos nomes de status;
- mesma moeda/formatação;
- mesmas regras de agenda;
- mesmos totais e bases financeiras;
- mesma interpretação de comanda fechada/cancelada;
- mesmos limites de plano.

## Editor de imagens

O editor visual antigo (`/salaopremiuneditor`) não faz mais parte do produto. Rotas, componentes, assets e proxy Pexels dessa feature foram removidos. Não adicionar links de menu para esse editor.

## Testes essenciais

- login/logout;
- isolamento entre dois salões;
- permissões por nível;
- agenda → comanda → caixa → fechamento;
- estoque e comissão pós-fechamento;
- assinatura/limites;
- Admin Master e ações críticas;
- webhooks e saúde operacional.

Use `npm run ci:validate` como base antes de release.