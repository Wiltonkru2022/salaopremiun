# Inventario do admin client

Gerado por `npm run audit:admin-client-inventory`.

Use este arquivo para revisar onde o service role ou `auth.admin` aparece. Qualquer nova linha com "revisar" precisa ser conferida antes de release.

| Arquivo | Rota | service role | auth.admin | tenant/guard | log/alerta |
| --- | --- | --- | --- | --- | --- |
| `app/(admin-master)/admin-master/saloes/[id]/page.tsx` | - | sim | nao | sim | revisar |
| `app/(admin-master)/admin-master/webhooks/[id]/page.tsx` | - | sim | nao | sim | revisar |
| `lib/admin-master/actions.ts` | - | sim | nao | sim | sim |
| `lib/admin-master/auth/requireAdminMasterUser.ts` | - | sim | nao | sim | revisar |
| `lib/admin-master/data.ts` | - | sim | nao | sim | sim |
| `lib/admin-master/operability.ts` | - | sim | nao | sim | revisar |
| `lib/assinatura-server.ts` | - | sim | nao | sim | revisar |
| `lib/auth/require-salao-membership.ts` | - | sim | nao | sim | sim |
| `lib/auth/require-salao-permission.ts` | - | sim | nao | sim | revisar |
| `lib/caixa/processar/dispatcher.ts` | - | sim | nao | sim | revisar |
| `lib/monitoring/server.ts` | - | sim | nao | sim | sim |
| `lib/plans/access.ts` | - | sim | nao | sim | revisar |
| `lib/profissional-context.server.ts` | - | sim | nao | sim | revisar |
| `lib/proxy/admin-master-rules.ts` | - | sim | nao | revisar | revisar |
| `lib/supabase/admin-ops.ts` | - | sim | nao | sim | revisar |
| `lib/supabase/admin.ts` | - | sim | nao | revisar | revisar |
| `lib/system-logs.ts` | - | sim | nao | sim | sim |
| `lib/vendas/processar.ts` | - | sim | nao | sim | revisar |
| `scripts/audit/admin-client-inventory.mjs` | - | sim | nao | sim | sim |
| `scripts/audit/admin-surface-audit.mjs` | - | sim | nao | revisar | revisar |
| `scripts/audit/service-role-audit.mjs` | - | sim | nao | sim | revisar |
| `scripts/e2e/saas-sales-flow.mjs` | - | sim | sim | sim | revisar |
| `services/asaasWebhookService.ts` | - | sim | nao | revisar | sim |
| `services/assinaturaCheckoutService.ts` | - | sim | nao | sim | revisar |
| `services/assinaturaCronService.ts` | - | sim | nao | revisar | revisar |
| `services/assinaturaService.ts` | - | sim | nao | sim | revisar |
| `services/cadastroSalaoService.ts` | - | sim | sim | sim | sim |
| `services/caixaRouteService.ts` | - | sim | nao | sim | revisar |
| `services/clienteService.ts` | - | sim | nao | sim | revisar |
| `services/comandaService.ts` | - | sim | nao | sim | sim |
| `services/comissaoService.ts` | - | sim | nao | sim | sim |
| `services/comissaoTaxaRouteService.ts` | - | sim | nao | sim | revisar |
| `services/comissaoTaxaService.ts` | - | sim | nao | sim | revisar |
| `services/estoqueComandaService.ts` | - | sim | nao | sim | sim |
| `services/estoqueMutacaoService.ts` | - | sim | nao | sim | revisar |
| `services/estoqueService.ts` | - | sim | nao | sim | sim |
| `services/monitoringService.ts` | - | sim | nao | sim | revisar |
| `services/produtoService.ts` | - | sim | nao | sim | revisar |
| `services/profissionalAcessoService.ts` | - | sim | nao | sim | revisar |
| `services/profissionalService.ts` | - | sim | nao | sim | revisar |
| `services/salaoMutacaoRouteService.ts` | - | sim | nao | sim | revisar |
| `services/servicoService.ts` | - | sim | nao | sim | revisar |
| `services/usuarioService.ts` | - | sim | sim | sim | revisar |
| `services/vendaService.ts` | - | sim | nao | sim | revisar |
