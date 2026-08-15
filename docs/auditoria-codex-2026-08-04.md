# Auditoria Codex — SalãoPremium

Data: 2026-08-04
Ambiente funcional: produção publicada
Dados: salão temporário sintético, criado e excluído ao final.

## Resumo

O cadastro de salão em quatro etapas, provisionamento de teste grátis, login, dashboard, módulos administrativos básicos, app cliente, app profissional, perfil/vitrine e exclusão segura foram exercitados. O link público do salão excluído retornou `Página não encontrada` e o painel voltou ao login.

Também foram executados os testes existentes de app cliente/profissional (relatório local anterior: aprovado) e auditorias estáticas. Lint terminou sem erros (um warning preexistente de dependência de hook em `apps/sistema-salao-premiun-vite/src/pages/ResourcePage.tsx`); typecheck passou.

## Correções aplicadas

### QA-001 — Endpoint Pexels do editor sem sessão

**Severidade:** Alto
**Módulo:** segurança / painel
**Arquivo:** `app/api/painel/editor/pexels/route.ts`

O endpoint consultava a API externa sem validar que a chamada vinha de uma sessão autenticada do painel. A rota agora usa `getPainelUserContext()` e responde `401` sem usuário e salão associados. Isso evita uso anônimo da cota externa e alinha a proteção ao restante do painel.

### QA-002 — Auditorias estáticas não reconheciam guards existentes

**Severidade:** Médio (qualidade do verificador)
**Arquivos:** `scripts/audit/api-guard-audit.mjs`, `scripts/audit/service-role-audit.mjs`

Os verificadores não reconheciam `requireMobileClientAccess` e `requireProfissionalAppContext`, gerando falsos positivos. Os padrões foram ampliados. Após a mudança: 128 rotas analisadas, 0 sem guard/motivo público; auditoria de `service_role` sem riscos altos/médios.

## Evidências verificadas

- `npm run audit:api-guards` — passou.
- `npm run audit:service-role` — passou.
- `npm run audit:critical-routes` — passou anteriormente.
- `npm run audit:launch-readiness` — passou, com um warning de texto codificado.
- `npm run lint` — 0 erros, 1 warning preexistente.
- `npm run typecheck` — passou.
- Fluxo app cliente/profissional existente — aprovado no relatório `.codex-app-flow-report.local.json`.
- Pós-exclusão: painel redireciona para login; URL pública do salão temporário retorna 404 funcional.

## Falhas e pendências

1. O preenchimento de CEP substituiu silenciosamente o logradouro digitado por um valor retornado pela consulta de CEP. Deve haver aviso ou opção de correção.
2. A rota `/agenda` apresentou estado sem heading/conteúdo identificável durante a navegação automatizada; requer reteste dedicado com dados de cliente/profissional/serviço.
3. A suíte smoke local falhou no login do painel por `ERR_NETWORK_ACCESS_DENIED` ao Supabase; não é evidência de falha do fluxo publicado.
4. O roteiro completo (venda, estoque, caixa, comissão, relatórios, bloqueios, cancelamentos e estornos encadeados) ainda não está comprovado nesta execução publicada. Não declarar prontidão total para produção sem essa rodada.
5. O auditor de launch-readiness detectou texto com possível mojibake em `app/services/cliente-app/auth.ts` (mensagem de credenciais inválidas).
6. A suíte publicada de cliente/profissional falhou inicialmente porque o fixture Premium E2E estava vencido (`vencimento_em=2026-06-28`); o provisionador renovou o fixture para 2026-09-03, mas o app continuou em 404, indicando cache/estado publicado ainda não atualizado. Foi adicionada invalidação de `plano-access-snapshot` após confirmação de assinatura em `lib/webhooks/asaas/subscription-sync.ts`; o reteste publicado completo depende de novo deploy/cache refresh.

## Auditorias estáticas pendentes

`npm run audit:architecture-boundaries` ainda falha por acesso Supabase direto e `any` em rotas de comprovante/sinal e módulos legados. São achados de arquitetura/manutenibilidade; não foram reescritos nesta rodada porque exigem extração para services sem alterar o contrato funcional.

## Limpeza

O salão temporário criado para a execução foi excluído pelo fluxo oficial de “Excluir salão definitivamente”. A conta autenticada perdeu acesso e o slug público deixou de existir. Nenhum salão fixo de E2E foi alterado.
