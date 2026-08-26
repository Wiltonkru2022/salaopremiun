# Documentação do SalãoPremium

Este diretório é a referência técnica do projeto. A documentação foi reorganizada para refletir a arquitetura real de produção e evitar que código ou instruções legadas sejam tratados como fonte da verdade.

## Arquitetura oficial

| Área | Fonte oficial |
| --- | --- |
| Site e Painel | Next.js em `app/` |
| App Cliente | Next.js em `app/app-cliente` |
| **App Profissional** | **Vite PWA em `apps/app-profissional-vite`** |
| Admin Master | Next.js em `app/(admin-master)` |
| APIs | `app/api` |
| Banco | `database/migrations` |

O antigo `app/app-profissional` foi removido. Qualquer documentação que ainda mencione essa implementação deve ser considerada histórica e corrigida antes de uso.

O editor de imagens `/salaopremiuneditor` também foi removido. A migration histórica do editor continua no repositório porque migrations aplicadas não devem ser apagadas.

## Leia primeiro

- [`../README.md`](../README.md) — visão completa do repositório.
- [`system-map.md`](system-map.md) — fluxo operacional e contratos de domínio.
- [`app-cliente.md`](app-cliente.md) — arquitetura e regras do App Cliente.
- [`app-profissional.md`](app-profissional.md) — arquitetura oficial do Vite PWA profissional.
- [`painel.md`](painel.md) — Painel do salão e Admin Master.
- [`auth.md`](auth.md) — autenticação, sessão e isolamento.
- [`permissoes.md`](permissoes.md) — autorização por superfície.

## Produção e operação

- [`producao.md`](producao.md) — variáveis, build, deploy e runtime.
- [`production-checklists.md`](production-checklists.md) — checklist principal de release.
- [`final-production-audit-checklist.md`](final-production-audit-checklist.md) — auditoria final.
- [`go-live-checklist.md`](go-live-checklist.md) — checklist comercial/go-live.
- [`backup-operacional.md`](backup-operacional.md) — backup de código e banco.
- [`database-required-functions.md`](database-required-functions.md) — RPCs/tabelas críticas.

## Segurança, LGPD e observabilidade

- [`lgpd-security-review.md`](lgpd-security-review.md)
- [`lgpd-ia-hardening-checklist.md`](lgpd-ia-hardening-checklist.md)
- [`operational-health.md`](operational-health.md)
- [`operational-health-coverage-report.md`](operational-health-coverage-report.md)
- [`web-push.md`](web-push.md)

## Testes

- [`test-accounts.md`](test-accounts.md) — criação segura de fixtures E2E.

## Documentos históricos

Os arquivos abaixo registram decisões/snapshots de uma data e **não substituem a documentação canônica atual**:

- [`auditoria-codex-2026-08-04.md`](auditoria-codex-2026-08-04.md)
- [`operational-health-coverage-report.md`](operational-health-coverage-report.md)
- [`app-profissional-google-oauth.md`](app-profissional-google-oauth.md) — histórico de uma integração desativada.

## Documentos gerados

`docs/generated/` contém somente artefatos de auditoria gerados por scripts. Eles podem ser recriados e não devem ser usados para definir a arquitetura manualmente.

## Regra de atualização

1. confirme no código qual é a implementação ativa;
2. atualize `README.md` e este índice;
3. atualize o documento da superfície afetada;
4. ajuste checklists de produção quando a mudança afetar build/deploy/segurança;
5. documentos históricos devem receber nota de obsolescência, não ser reescritos como se o passado tivesse sido diferente.

Nunca documente segredo, senha real, Service Role, token de provedor ou credencial E2E.