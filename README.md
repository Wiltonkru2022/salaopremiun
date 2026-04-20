# SalaoPremium

SaaS multi-tenant para saloes de beleza, com agenda, comandas, caixa, vendas, estoque, comissoes, assinatura, app profissional e AdminMaster.

O isolamento principal e feito por `id_salao`. Qualquer fluxo que leia ou escreva dados operacionais precisa validar usuario, salao, permissao, plano e status comercial antes de aplicar efeitos no banco.

## Comandos Por Objetivo

### Desenvolvimento

```bash
npm run dev
npm run dev:inspect
```

### Checagem Local

```bash
npm run check
npm run typecheck
npm run lint
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

### Monitoramento E Auditoria

```bash
npm run audit:service-role
npm run audit:admin-actions
npm run audit:admin-client-inventory
```

## Mapa De Dominios

| Dominio | UI | APIs | Libs | Banco/RPC |
| --- | --- | --- | --- | --- |
| Auth e tenant | `app/login`, `app/recuperar-senha`, `app/atualizar-senha`, `proxy.ts` | `app/api/auth`, `app/api/usuarios` | `lib/auth`, `lib/supabase`, `lib/proxy` | `usuarios`, cookies Supabase |
| Agenda | `app/(painel)/agenda`, `components/agenda` | rotas ligadas a agenda/comandas | `lib/agenda` | `agendamentos`, `agenda_bloqueios` |
| Comandas | `app/(painel)/comandas`, `components/comandas` | `app/api/comandas/processar` | `lib/comandas`, `lib/comanda-utils.ts` | `fn_salvar_comanda_base`, `fn_comanda_*` |
| Caixa | `app/(painel)/caixa`, `components/caixa` | `app/api/caixa/processar` | `lib/caixa` | `fn_caixa_*` |
| Vendas | `app/(painel)/vendas`, `components/vendas` | `app/api/vendas/processar` | `lib/vendas`, `lib/caixa`, `lib/comandas` | `fn_detalhes_venda`, `fn_reabrir_venda_para_caixa` |
| Servicos | `app/(painel)/servicos`, `components/servicos` | `app/api/servicos/processar` | `lib/comissoes`, `lib/domain` | `servicos_catalogo`, `fn_salvar_servico_catalogo_transacional` |
| Produtos e estoque | `app/(painel)/produtos`, `app/(painel)/estoque`, `components/produtos`, `components/estoque` | `app/api/produtos`, `app/api/estoque` | `lib/estoque` | `produtos`, `fn_aplicar_estoque_comanda`, `fn_reverter_estoque_comanda` |
| Comissoes | `app/(painel)/comissoes`, `components/comissoes` | `app/api/comissoes` | `lib/comissoes` | regras de servico/profissional/comanda |
| Assinatura | `app/(painel)/assinatura`, `components/assinatura` | `app/api/assinatura`, `app/api/cron/renovar-assinaturas` | `lib/assinaturas`, `lib/assinatura-utils.ts`, `lib/plans` | `assinaturas`, `assinaturas_cobrancas`, planos |
| Webhooks | AdminMaster webhooks | `app/api/webhooks/asaas` | `lib/webhooks`, `lib/payments` | `asaas_webhook_eventos`, `eventos_webhook` |
| Notificacoes e logs | `components/layout/NotificationBell`, AdminMaster alertas | `app/api/shell-notifications`, `app/api/monitoring/event`, `app/api/admin-master/alertas` | `lib/notifications`, `lib/monitoring`, `lib/system-logs.ts` | `logs_sistema`, `alertas_sistema` |
| App profissional | `app/app-profissional`, `components/profissional` | `app/api/app-profissional` | `lib/profissional-*`, `lib/support` | sessoes/tickets/faturamento/agendamentos |
| AdminMaster | `app/(admin-master)/admin-master`, `components/admin-master` | `app/api/admin-master` | `lib/admin-master` | saude, tickets, flags, planos, saloes |

## Fluxo De Auth

1. Usuario acessa dominio principal ou subdominio.
2. `proxy.ts` aplica roteamento de alto nivel e preserva a compatibilidade de cookies.
3. Paginas e route handlers revalidam sessao no servidor com `lib/supabase/server.ts`.
4. Regras sensiveis usam `lib/auth/*` para confirmar usuario, salao, papel e permissao.
5. O browser usa `lib/supabase/client.ts`, que mantem singleton para evitar instancias redundantes.
6. Cookies precisam usar as mesmas regras de dominio em `lib/supabase/cookie-options.ts` e `proxy.ts`.

## Fluxo De Assinatura

1. Salao entra em trial ou seleciona plano.
2. `app/api/assinatura/criar-cobranca/route.ts` cria ou reutiliza cobranca idempotente.
3. Asaas envia webhook para `app/api/webhooks/asaas/route.ts`.
4. Webhook registra evento, atualiza cobranca, materializa assinatura e sincroniza salao.
5. `app/api/cron/renovar-assinaturas/route.ts` atua como reconciliacao, nunca como segunda fonte de verdade.
6. `lib/assinatura-utils.ts` e `lib/assinaturas/*` devem ser a unica leitura oficial de status comercial.

## Mapa De RPCs Criticas

O contrato minimo fica em `docs/database-required-functions.md` e e validado por:

```bash
npm run audit:database-contract
```

Toda chamada `.rpc("nome_da_funcao")` no codigo precisa ter definicao correspondente em `supabase/migrations/*`.

## Checklists Operacionais

- Producao e release: `docs/production-checklists.md`
- Contrato de banco e migrations: `docs/database-required-functions.md`
- Seguranca/LGPD: `docs/lgpd-security-review.md`
- Auth e permissoes: `docs/auth.md`, `docs/permissoes.md`
- Inventario de service role: gerado por `npm run audit:admin-client-inventory`

## Regras De Mudanca

- Fluxos financeiros e comerciais nao podem depender so da UI.
- Agenda, comanda, caixa, venda, estoque e comissao precisam compartilhar regra centralizada em `lib/*`.
- `window.confirm` nao deve ser usado em fluxos operacionais; use `components/ui/ConfirmActionModal.tsx`.
- Toda nova rota em `app/api/*` precisa declarar guard de autenticacao/tenant ou motivo publico claro.
- Toda migration critica deve atualizar a lista de RPCs/tabelas obrigatorias e passar no healthcheck.
