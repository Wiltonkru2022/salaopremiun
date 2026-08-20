# Relatório de Cobertura Operacional — SalãoPremium

Data da implementação: 19/08/2026.

## Antes

A arquitetura anterior não possuía um registro central capaz de medir matematicamente a cobertura operacional.

Evidências do snapshot auditado antes desta implementação:

- `health_checks_sistema`: 0 checks registrados;
- 31 incidentes persistidos como abertos no snapshot solicitado;
- 31 sem nova ocorrência havia mais de 6 horas;
- 28 sem nova ocorrência havia mais de 24 horas;
- telemetria recente concentrada principalmente no client;
- limites de UI de eventos/incidentes/checks influenciavam a leitura de saúde;
- não existia uma métrica confiável `componentes monitorados / componentes conhecidos`.

Por isso a cobertura anterior deve ser descrita como **não mensurável**, e não como `0%` ou qualquer porcentagem inventada.

## Depois — cobertura estática conhecida

O registro `config/operational-components.json` contém:

- **43 componentes operacionais conhecidos**;
- **18 componentes críticos**;
- **43/43 com identidade de probe/monitor**;
- **18/18 críticos com identidade de probe/monitor**.

Cobertura estática do registro conhecido:

- total: **100,0% (43/43)**;
- crítica: **100,0% (18/18)**.

Isso **não significa 100% de disponibilidade**.

A cobertura operacional runtime depende de:

1. migration aplicada;
2. registry sincronizado;
3. probe realmente executado;
4. health check dentro do TTL/freshness;
5. evidência positiva válida para o componente.

Antes do primeiro ciclo pós-deploy, o estado correto é `Unknown / Estado desconhecido`.

## Grupos catalogados

- Plataforma;
- Infraestrutura/Vercel;
- Supabase Database, Data API, Auth, Storage e Realtime;
- App Cliente;
- App Profissional;
- Administração/Admin Master;
- Agenda;
- Clientes/CRM;
- Serviços;
- Caixa/Comandas/Vendas;
- Assinaturas e Cobranças;
- Asaas API e Webhooks;
- Brevo/E-mail;
- WhatsApp Meta API;
- Web Push/VAPID;
- Google Calendar;
- Cron/Jobs.

Nenhuma Edge Function é exibida como saudável porque os projetos Supabase inspecionados não possuem Edge Functions implantadas atualmente.

## Probes positivos

Os componentes conhecidos possuem probes seguros por domínio, entre eles:

- HTTP read-only;
- leitura canário `select id limit 1`;
- Supabase Auth admin `listUsers` com `perPage=1`;
- Storage `listBuckets`;
- handshake real de Realtime com remoção do canal em seguida;
- Asaas read-only account endpoint;
- Brevo read-only account endpoint;
- WhatsApp Meta read-only phone-id;
- amostra de entregas push já existentes;
- amostra de webhooks existentes;
- freshness de cron;
- manifests PWA.

Não são criados clientes, agendamentos, cobranças, e-mails, pagamentos ou webhooks falsos como health check.

## Auditor de CI

`npm run audit:operational-coverage` faz inventário do código e cruza superfícies críticas com o registro/telemetria.

Critérios usados incluem:

- Route Handlers e métodos mutáveis;
- `use server` / Server Actions;
- chamadas de mutação no banco/RPC;
- autenticação/sessão;
- pagamentos/Asaas;
- webhooks;
- cron/jobs;
- agenda/comandas/caixa;
- padrões de código e rotas reais.

Um componente genérico como `platform.api` não é suficiente para cobrir uma rota crítica de um domínio específico.

Resultado da branch desta implementação:

- auditor de cobertura: **PASS**;
- superfícies críticas detectadas sem cobertura específica: **0**.

## Validações executadas

No checkout real da branch:

- `npm run test:operational` — PASS;
- `npm run audit:operational-coverage` — PASS;
- `npm run lint` — PASS;
- `npm run typecheck` — PASS;
- `npm run typecheck:professional` — PASS;
- `npm run build:professional` — PASS;
- `npm run ci:audit` — PASS;
- `npm run build` — PASS;
- `npm run ci:validate` — PASS;
- build de produção local + `npm run e2e:status` — PASS.

## O que somente o rollout pode provar

O relatório não declara antecipadamente:

- uptime;
- disponibilidade 100%;
- 43/43 componentes operacionais;
- recuperação dos 31 incidentes legados;
- ausência definitiva do React #418 em produção.

Esses itens exigem deployment atual + probes frescos + janela sem recorrência e reconciliação baseada em evidências.
