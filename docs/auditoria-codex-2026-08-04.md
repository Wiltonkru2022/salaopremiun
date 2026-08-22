# Auditoria Codex — 04/08/2026

> **Documento histórico.** Ele registra o estado encontrado em 04/08/2026 e não é a arquitetura atual. Consulte `README.md` e `docs/README.md` para a fonte de verdade.

## Snapshot da época

A execução auditou cadastro de salão, trial, login, dashboard, módulos administrativos, App Cliente, App Profissional, perfil público e exclusão segura usando dados sintéticos.

Naquele momento também existiam achados e módulos que mudaram posteriormente.

## Correções registradas na época

### Endpoint Pexels do editor

O endpoint do antigo editor foi protegido por contexto autenticado para evitar consumo anônimo de cota externa.

**Atualização posterior:** o editor de imagens `/salaopremiuneditor`, seus assets e o endpoint Pexels foram removidos do produto. A migration histórica do editor permanece versionada por integridade do histórico do banco.

### Auditorias de guards

Os auditores foram ampliados para reconhecer guards do App Cliente e do App Profissional.

## Mudança arquitetural posterior importante

A implementação Next antiga em `app/app-profissional` foi removida. O **único App Profissional oficial atual é o Vite PWA em `apps/app-profissional-vite`**.

Portanto, qualquer referência antiga a páginas/componentes do App Profissional Next neste snapshot não deve orientar manutenção atual.

## Evidências históricas

Na execução original foram registrados resultados de lint/typecheck/auditorias e fluxo E2E. Esses resultados provam apenas aquele checkout/data, não o deployment atual.

## Pendências históricas

O snapshot mencionava pontos como CEP, rota de agenda, ambiente de smoke, roteiro financeiro completo, encoding de texto, fixtures expirados e fronteiras arquiteturais. Cada item precisa ser reavaliado contra o código atual antes de ser tratado como pendência aberta.

## Regra

Não use este arquivo para declarar “produção aprovada”. Execute as validações atuais:

```bash
npm run ci:validate
npm run validate:release
```

E consulte a saúde do deployment corrente.