# Relatório Histórico de Cobertura Operacional

> **Snapshot histórico de 19/08/2026. Não use os números deste arquivo como estado atual do sistema.** O catálogo e o código evoluem; para o estado corrente execute `npm run audit:operational-coverage` e consulte a Saúde do deployment atual.

## Contexto do snapshot

Antes da implementação auditada, não havia registro central suficiente para calcular uma porcentagem confiável de cobertura. Portanto, o estado anterior foi corretamente descrito como **não mensurável**, e não como `0%` inventado.

Naquele snapshot foi criado um catálogo versionado em `config/operational-components.json`, com identificação de componentes, criticidade, monitor/probe e dependências.

## O que “cobertura” significa

Cobertura estática significa que uma superfície conhecida possui monitor/probe/telemetria definida. Isso **não** significa disponibilidade 100%.

Disponibilidade runtime exige:

1. migration/configuração aplicável;
2. registry sincronizado;
3. probe realmente executado;
4. check dentro do TTL;
5. evidência positiva válida;
6. deployment/commit atual.

## Grupos monitorados

O catálogo inclui áreas como:

- plataforma/Vercel;
- Neon Database/Data API/Auth/Storage/Realtime;
- App Cliente;
- App Profissional;
- Painel/Admin Master;
- agenda;
- CRM;
- serviços;
- caixa/comandas/vendas;
- assinaturas/cobranças;
- Asaas/webhooks;
- Brevo;
- WhatsApp Meta;
- Web Push;
- Google Calendar;
- cron/jobs.

### Atualização arquitetural posterior

O App Profissional oficial passou a ser exclusivamente o Vite em `apps/app-profissional-vite`; a antiga árvore Next `app/app-profissional` foi removida. Auditorias/registry atuais devem mapear a superfície profissional para o Vite e para `/api/app-profissional/*`.

## Probes positivos

O desenho prioriza:

- HTTP read-only;
- leitura canário;
- checks de Auth/Storage/Realtime;
- endpoints read-only de provedores;
- evidência de entregas/jobs existentes;
- freshness de cron;
- manifests/PWA.

Não criar dados comerciais falsos como healthcheck.

## Auditor de CI

```bash
npm run audit:operational-coverage
```

O auditor cruza superfícies críticas com o registro/sinais de observabilidade. Uma cobertura genérica de `platform.api` não substitui cobertura específica de auth, pagamento, webhook ou outro domínio crítico.

## Validade deste documento

Este arquivo preserva a decisão e metodologia do snapshot. Resultados de PASS, contagem de componentes e incidentes daquela data não devem ser repetidos como prova de saúde atual.