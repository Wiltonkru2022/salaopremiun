# SalaoPremium

SaaS multi-tenant para salões de beleza com agenda, comandas, caixa, vendas, serviços, produtos, assinatura, app profissional e AdminMaster.

O isolamento principal é feito por `id_salao`. Qualquer fluxo operacional ou comercial precisa validar:

1. sessão
2. usuário
3. salão
4. permissão
5. plano
6. status comercial

## Comandos por objetivo

### Desenvolvimento

```bash
npm run dev
npm run dev:inspect
```

### Checagem local

```bash
npm run check
npm run typecheck
npm run lint
npm run build
```

### CI

```bash
npm run ci:validate
```

### Release

```bash
npm run release:validate
```

### Banco

```bash
npm run db:healthcheck
npm run audit:database-contract
```

### Auditorias

```bash
npm run audit:security
npm run audit:service-role
npm run audit:admin-actions
npm run audit:admin-client-inventory
npm run audit:admin-surface
npm run audit:api-guards
npm run audit:critical-routes
npm run audit:no-wildcard-select
npm run audit:architecture-boundaries
```

## Mapa de domínios

| Domínio | UI | APIs | Libs | Banco / RPC |
| --- | --- | --- | --- | --- |
| Auth e tenant | `app/login`, `app/recuperar-senha`, `app/atualizar-senha`, `proxy.ts` | `app/api/usuarios`, `app/api/cadastro-salao` | `lib/auth`, `lib/supabase`, `lib/proxy` | `usuarios`, cookies Supabase |
| Agenda | `app/(painel)/agenda`, `components/agenda` | fluxos ligados a agenda/comandas | `lib/agenda` | `agendamentos`, `agenda_bloqueios` |
| Comandas | `app/(painel)/comandas`, `components/comandas` | `app/api/comandas/processar` | `lib/comandas`, `lib/comanda-utils.ts` | `fn_salvar_comanda_base`, `fn_comanda_*` |
| Caixa | `app/(painel)/caixa`, `components/caixa` | `app/api/caixa/processar` | `lib/caixa` | `fn_caixa_*`, `caixa_sessoes`, `comanda_pagamentos` |
| Vendas | `app/(painel)/vendas`, `components/vendas` | `app/api/vendas/processar` | `lib/vendas`, `lib/caixa`, `lib/comandas` | `fn_detalhes_venda`, `fn_reabrir_venda_para_caixa` |
| Serviços | `app/(painel)/servicos`, `components/servicos` | `app/api/servicos/processar` | `lib/comissoes`, `lib/domain` | `servicos`, `fn_salvar_servico_catalogo_transacional` |
| Produtos e estoque | `app/(painel)/produtos`, `app/(painel)/estoque`, `components/produtos`, `components/estoque` | `app/api/produtos`, `app/api/estoque` | `lib/estoque` | `produtos`, `fn_aplicar_estoque_comanda`, `fn_reverter_estoque_comanda` |
| Comissões | `app/(painel)/comissoes`, `components/comissoes` | `app/api/comissoes/processar` | `lib/comissoes` | `comissoes_lancamentos`, regras por serviço/profissional/comanda |
| Assinatura e planos | `app/(painel)/assinatura`, `app/(painel)/meu-plano`, `app/(painel)/comparar-planos`, `components/assinatura` | `app/api/assinatura/*`, `app/api/plano/access`, `app/api/cron/renovar-assinaturas` | `lib/assinaturas`, `lib/assinatura-utils.ts`, `lib/plans` | `assinaturas`, `assinaturas_cobrancas`, `planos_saas`, `planos_recursos` |
| Webhooks | AdminMaster / billing | `app/api/webhooks/asaas` | `lib/webhooks`, `lib/payments` | `asaas_webhook_eventos`, `eventos_webhook` |
| Notificações e logs | `components/layout/NotificationBell`, AdminMaster alertas | `app/api/shell-notifications`, `app/api/monitoring/event`, `app/api/admin-master/alertas` | `lib/notifications`, `lib/monitoring`, `lib/system-logs.ts` | `logs_sistema`, `alertas_sistema` |
| App profissional | `app/app-profissional`, `components/profissional` | `app/api/app-profissional` | `lib/profissional-*`, `lib/support` | sessões, tickets, faturamento, agendamentos |
| AdminMaster | `app/(admin-master)/admin-master`, `components/admin-master` | `app/api/admin-master/*` | `lib/admin-master` | saúde, tickets, flags, planos, salões |

## Fluxo de auth

1. usuário acessa domínio principal ou subdomínio
2. `proxy.ts` faz o roteamento inicial e decide a casca correta
3. páginas e route handlers revalidam sessão no servidor com `lib/supabase/server.ts`
4. regras sensíveis usam `lib/auth/*` para confirmar usuário, salão, papel e permissão
5. o browser usa `lib/supabase/client.ts`, com singleton para evitar instâncias redundantes
6. cookies precisam continuar coerentes com `lib/supabase/cookie-options.ts` e `proxy.ts`

## Fluxo de assinatura

1. salão entra em trial ou escolhe plano
2. `app/api/assinatura/criar-cobranca/route.ts` cria ou reutiliza cobrança idempotente
3. Asaas envia webhook para `app/api/webhooks/asaas/route.ts`
4. webhook registra evento, atualiza cobrança, materializa assinatura e sincroniza salão
5. `app/api/cron/renovar-assinaturas/route.ts` age como reconciliação, nunca como segunda fonte de verdade
6. `lib/assinatura-utils.ts` e `lib/assinaturas/*` são a leitura oficial de status comercial

## Engine de planos

A engine vive principalmente em:

- `lib/plans/access.ts`
- `lib/plans/catalog.ts`
- `app/api/plano/access/route.ts`
- `lib/painel/load-painel-shell-data.ts`
- `components/layout/navigation.tsx`

### Camadas de enforcement

O plano precisa bater em quatro lugares:

1. **menu**: esconder módulo não liberado
2. **rota**: impedir acesso por URL direta
3. **ação**: impedir mutação que o plano não cobre
4. **limite numérico**: bloquear criação quando bater teto

Se uma dessas camadas ficar solta, o produto fica incoerente.

## Matriz oficial de planos

### Teste grátis

- foco: provar operação
- libera: agenda, clientes, profissionais, serviços, serviços extras, produtos, caixa, comandas, vendas, comissões básicas, relatórios básicos
- bloqueia: estoque, marketing, app profissional, whatsapp, campanhas, comissões avançadas, relatórios avançados, dashboard avançado
- limites:
  - usuários: `1`
  - profissionais: `3`
  - clientes: `100`
  - serviços: `20`
  - agendamentos no período: `40`

### Básico

- foco: salão pequeno operando bem
- libera: agenda, clientes, profissionais, serviços, serviços extras, produtos, caixa, comandas, vendas, comissões básicas, relatórios básicos
- bloqueia: estoque, marketing, whatsapp, campanhas, app profissional, comissões avançadas, relatórios avançados, dashboard avançado
- limites:
  - usuários: `2`
  - profissionais: `3`
  - clientes: `2.000`
  - serviços: `80`
  - agendamentos por mês: `250`

### Pro

- foco: equipe em crescimento
- libera tudo do Básico + estoque + app profissional + comissões avançadas + relatórios avançados + dashboard avançado + marketing
- mantém fora do núcleo:
  - whatsapp avançado / pacotes
  - campanhas premium
- limites:
  - usuários: `5`
  - profissionais: `10`
  - clientes: `10.000`
  - serviços: `250`
  - agendamentos por mês: `900`

### Premium

- libera tudo
- limites operacionais: sem teto prático

## O que é básico vs avançado

### Comissões básicas

- listar lançamentos
- filtrar por período, profissional e status
- marcar pago
- impressão simples
- comissão automática da venda

### Comissões avançadas

- auditoria de origem e regra
- leitura por combo e rateio
- recálculo manual
- detalhamento de taxa, desconto e base
- análise mais profunda por profissional

### Relatórios básicos

- vendas do período
- pagamentos por forma
- total de comissões do período
- impressão simples

### Relatórios avançados

- ticket médio
- cancelamentos
- fechamento de caixa com sobra / quebra
- leitura gerencial mais densa

### Dashboard avançado

- widgets premium no dashboard atual
- não precisa ser outra página; a própria tela esconde ou mostra os blocos

## Onde limites são aplicados

### Já bloqueados

- usuários
- profissionais
- clientes
- serviços
- agenda mensal
- módulos completos como estoque, marketing e app profissional

### Pontos de enforcement

- `core/use-cases/usuarios/criarUsuario.ts`
- `core/use-cases/profissionais/processarProfissional.ts`
- `core/use-cases/clientes/processarCliente.ts`
- `core/use-cases/servicos/processarServico.ts`
- `lib/agenda/saveAgendaItem.ts`
- `app/app-profissional/clientes/novo/actions.ts`
- `app/app-profissional/comandas/nova/actions.ts`

## Meu Plano e comparar planos

- `Meu Plano` deve ser encontrável no menu da conta e no selo de plano da topbar
- `Comparar planos` apresenta:
  - preço
  - foco do plano
  - público ideal
  - limites
  - recursos liberados
  - recursos ainda bloqueados
- botões de upgrade e downgrade levam para `/assinatura?plano=...`

## RPCs críticas

O contrato mínimo fica em `docs/database-required-functions.md` e é validado por:

```bash
npm run audit:database-contract
```

Toda chamada `.rpc("nome_da_funcao")` no código precisa ter definição correspondente em `supabase/migrations/*`.

## Checklists operacionais

- produção e release: `docs/production-checklists.md`
- auditoria final: `docs/final-production-audit-checklist.md`
- contrato de banco e migrations: `docs/database-required-functions.md`
- segurança e LGPD: `docs/lgpd-security-review.md`
- auth e permissões: `docs/auth.md`, `docs/permissoes.md`

## Regras de mudança

- fluxos financeiros e comerciais não podem depender só da UI
- agenda, comanda, caixa, venda, estoque e comissão precisam compartilhar regra centralizada em `lib/*`
- `window.confirm` não deve entrar em fluxo operacional; use `components/ui/ConfirmActionModal.tsx`
- toda nova rota em `app/api/*` precisa declarar guard de autenticação / tenant ou motivo público claro
- toda migration crítica precisa manter as auditorias e o contrato de banco saudáveis
