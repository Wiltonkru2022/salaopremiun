# Inventario do admin client

Gerado por `npm run audit:admin-client-inventory`.

Use este arquivo para revisar onde o service role ou `auth.admin` aparece. Qualquer nova linha com "revisar" precisa ser conferida antes de release.

| Arquivo | Rota | service role | auth.admin | tenant/guard | log/alerta |
| --- | --- | --- | --- | --- | --- |
| `app/(admin-master)/admin-master/saloes/[id]/page.tsx` | - | sim | nao | sim | revisar |
| `app/(admin-master)/admin-master/webhooks/[id]/page.tsx` | - | sim | nao | sim | revisar |
| `app/(painel)/layout.tsx` | - | sim | nao | sim | revisar |
| `app/api/admin-master/checklists/avaliar-trial-extra/route.ts` | /api/admin-master/checklists/avaliar-trial-extra | sim | nao | sim | revisar |
| `app/api/admin-master/saude/rpcs/route.ts` | /api/admin-master/saude/rpcs | sim | nao | sim | revisar |
| `app/api/admin-master/search/route.ts` | /api/admin-master/search | sim | nao | sim | revisar |
| `app/api/admin-master/webhooks/[id]/reprocessar/route.ts` | /api/admin-master/webhooks/:id/reprocessar | sim | nao | sim | revisar |
| `app/api/assinatura/criar-cobranca/route.ts` | /api/assinatura/criar-cobranca | sim | nao | sim | revisar |
| `app/api/assinatura/historico/route.ts` | /api/assinatura/historico | sim | nao | sim | revisar |
| `app/api/assinatura/iniciar-trial/route.ts` | /api/assinatura/iniciar-trial | sim | nao | sim | revisar |
| `app/api/assinatura/toggle-renovacao/route.ts` | /api/assinatura/toggle-renovacao | sim | nao | sim | revisar |
| `app/api/cadastro-salao/route.ts` | /api/cadastro-salao | sim | sim | sim | sim |
| `app/api/caixa/processar/route.ts` | /api/caixa/processar | sim | nao | sim | revisar |
| `app/api/comandas/processar/route.ts` | /api/comandas/processar | sim | nao | sim | sim |
| `app/api/comissoes/processar/route.ts` | /api/comissoes/processar | sim | nao | sim | sim |
| `app/api/comissoes/recalcular-taxa-profissional/route.ts` | /api/comissoes/recalcular-taxa-profissional | sim | nao | sim | revisar |
| `app/api/cron/renovar-assinaturas/route.ts` | /api/cron/renovar-assinaturas | sim | nao | sim | revisar |
| `app/api/estoque/processar-comanda/route.ts` | /api/estoque/processar-comanda | sim | nao | sim | sim |
| `app/api/estoque/processar/route.ts` | /api/estoque/processar | sim | nao | sim | revisar |
| `app/api/estoque/reverter-comanda/route.ts` | /api/estoque/reverter-comanda | sim | nao | sim | sim |
| `app/api/monitoring/event/route.ts` | /api/monitoring/event | sim | nao | sim | revisar |
| `app/api/produtos/processar/route.ts` | /api/produtos/processar | sim | nao | sim | revisar |
| `app/api/profissionais-acessos/route.ts` | /api/profissionais-acessos | sim | nao | sim | revisar |
| `app/api/profissionais/processar/route.ts` | /api/profissionais/processar | sim | nao | sim | revisar |
| `app/api/servicos/processar/route.ts` | /api/servicos/processar | sim | nao | sim | revisar |
| `app/api/shell-notifications/route.ts` | /api/shell-notifications | sim | nao | sim | sim |
| `app/api/usuarios/atualizar/route.ts` | /api/usuarios/atualizar | sim | sim | sim | revisar |
| `app/api/usuarios/criar/route.ts` | /api/usuarios/criar | sim | sim | sim | revisar |
| `app/api/usuarios/excluir/route.ts` | /api/usuarios/excluir | sim | sim | sim | revisar |
| `app/api/vendas/processar/route.ts` | /api/vendas/processar | sim | nao | sim | sim |
| `app/api/webhooks/asaas/route.ts` | /api/webhooks/asaas | sim | nao | sim | sim |
| `app/app-profissional/agenda/novo/page.tsx` | - | sim | nao | sim | revisar |
| `app/app-profissional/comandas/[id]/actions.ts` | - | sim | nao | sim | sim |
| `app/app-profissional/comandas/[id]/page.tsx` | - | sim | nao | sim | revisar |
| `app/services/profissional/agenda.ts` | - | sim | nao | sim | revisar |
| `app/services/profissional/auth.ts` | - | sim | nao | sim | revisar |
| `app/services/profissional/comissao.ts` | - | sim | nao | sim | revisar |
| `app/services/profissional/resumo.ts` | - | sim | nao | sim | revisar |
| `app/services/profissional/suporte.ts` | - | sim | nao | sim | revisar |
| `lib/admin-master/actions.ts` | - | sim | nao | sim | sim |
| `lib/admin-master/alerts-sync.ts` | - | sim | nao | sim | sim |
| `lib/admin-master/auth/requireAdminMasterUser.ts` | - | sim | nao | sim | revisar |
| `lib/admin-master/data.ts` | - | sim | nao | sim | sim |
| `lib/admin-master/health-center.ts` | - | sim | nao | sim | sim |
| `lib/admin-master/operability.ts` | - | sim | nao | sim | revisar |
| `lib/admin-master/webhooks-sync.ts` | - | sim | nao | sim | revisar |
| `lib/assinatura-server.ts` | - | sim | nao | sim | revisar |
| `lib/auth/require-salao-membership.ts` | - | sim | nao | sim | sim |
| `lib/auth/require-salao-permission.ts` | - | sim | nao | sim | revisar |
| `lib/monitoring/server.ts` | - | sim | nao | sim | sim |
| `lib/plans/access.ts` | - | sim | nao | sim | revisar |
| `lib/proxy/admin-master-rules.ts` | - | sim | nao | revisar | revisar |
| `lib/supabase/admin.ts` | - | sim | nao | revisar | revisar |
| `lib/support/tickets.ts` | - | sim | nao | sim | sim |
| `lib/system-logs.ts` | - | sim | nao | sim | sim |
| `scripts/audit/admin-client-inventory.mjs` | - | sim | nao | sim | sim |
| `scripts/audit/service-role-audit.mjs` | - | sim | nao | sim | revisar |
| `scripts/e2e/saas-sales-flow.mjs` | - | sim | sim | sim | revisar |
