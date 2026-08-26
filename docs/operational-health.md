# Saúde Operacional — SalãoPremium

## Objetivo

A camada de saúde operacional é **best effort** e não deve quebrar os fluxos principais quando ela própria estiver indisponível. Ausência de erro não é prova de saúde e `unknown` nunca deve ser transformado em verde apenas por falta de telemetria.

## Fonte de catálogo

`config/operational-components.json` cataloga componentes, criticidade, owner, tipo de probe, frequência, TTL e dependências.

As superfícies oficiais são:

- Next.js público/Painel/Admin Master;
- App Cliente Next.js;
- App Profissional **Vite PWA**;
- APIs Next.js;
- Neon;
- integrações externas.

A implementação Next antiga do App Profissional foi removida; monitoramento da superfície profissional deve apontar para `apps/app-profissional-vite`, `public/app-profissional` e `/api/app-profissional/*`.

## Probes

Princípios:

- HTTP read-only;
- leitura canário com limite pequeno;
- Auth/Storage/Reatime com operação não destrutiva;
- integrações externas com endpoints read-only quando possível;
- nunca criar cliente, agendamento, cobrança, pagamento ou webhook falso só para healthcheck;
- nunca armazenar segredo na evidência.

## Freshness

Cada check possui janela de validade. Check atrasado vira `unknown/degraded` conforme a regra; não é considerado saudável por histórico antigo.

## Anti-flapping

Mudanças de estado podem exigir sucessos/falhas consecutivos. Recuperação automática deve possuir evidência positiva e não apenas silêncio de erros.

## Incidentes

Fluxo esperado:

```text
detectado → aberto → investigando → recuperando → resolvido
```

Estados adicionais podem incluir recorrência, supressão e manutenção. Fingerprints precisam normalizar dados variáveis/PII antes de agrupamento.

## Resolução automática

Combinar quando aplicável:

1. janela sem nova ocorrência;
2. probe fresco;
3. sucessos consecutivos;
4. componente recuperado;
5. dependências críticas saudáveis;
6. deployment/commit atual;
7. ausência de evidência contraditória posterior.

## Erro de usuário

Credencial inválida, validação de formulário e sessão expirada não são automaticamente outage. Podem alimentar telemetria/segurança, mas incidente operacional exige contexto e agregação.

## PWA e assets

Monitorar:

- chunks Next;
- manifest/service worker do App Cliente;
- `public/app-profissional` e service worker do Vite;
- cache preso em versão antiga;
- falha real de asset separada de erro de aplicação.

## Neon Advisors

Advisor é evidência/recomendação, não autorização para alteração automática. Nunca:

- desabilitar RLS automaticamente;
- ampliar `GRANT/EXECUTE` sem revisão;
- excluir tabela/índice/dado sem aprovação;
- rotacionar segredo sem fluxo controlado.

## Status público

- `/status`;
- `/status/history`;
- `/api/status`.

Se evidência/freshness falhar, exibir estado desconhecido em vez de afirmar disponibilidade total.

## Runbooks resumidos

### Neon Database

Verificar probe, latência, erros Postgres/Data API/RLS e mudanças recentes. Recuperação precisa de leituras saudáveis consecutivas.

### App Cliente

Verificar login, disponibilidade, agendamentos, SSR/hydration, timezone, APIs e deployment atual.

### App Profissional Vite

Verificar:

- `/app-profissional/`/bundle;
- `/api/app-profissional/auth/session`;
- login/logout;
- fetches de dados;
- service worker/cache;
- push/offline;
- permissões e tenant.

### Agenda/Caixa

Usar canários de leitura e erros de ações reais; não criar transações fictícias.

### Asaas/Webhooks

Separar rejeição de negócio, timeout, 5xx, backlog e duplicidade. Reprocessar automaticamente apenas operações idempotentes.

### Cron

Job atrasado deve aparecer como desconhecido/degradado, não saudável.

## CI

```bash
npm run audit:operational-coverage
npm run test:operational
npm run e2e:status
```

## Rollout

1. lint/typecheck/auditorias/testes/build;
2. migrations;
3. deployment;
4. probes frescos;
5. reconciliação de incidentes;
6. smoke das superfícies;
7. acompanhamento da janela pós-release.