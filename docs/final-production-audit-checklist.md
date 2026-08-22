# Auditoria Final de Produção

Checklist final antes de promover um release do SalãoPremium.

## Código e CI

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run typecheck:professional`
- [ ] `npm run audit:database-contract`
- [ ] `npm run audit:service-role`
- [ ] `npm run audit:admin-actions`
- [ ] `npm run audit:admin-client-inventory`
- [ ] `npm run audit:admin-surface`
- [ ] `npm run audit:api-guards`
- [ ] `npm run audit:critical-routes`
- [ ] `npm run audit:no-wildcard-select`
- [ ] `npm run audit:architecture-boundaries`
- [ ] `npm run audit:operational-coverage`
- [ ] `npm run audit:launch-readiness`
- [ ] `npm run test:operational`
- [ ] `npm run build`

## Arquitetura

- [ ] App Profissional é compilado de `apps/app-profissional-vite`;
- [ ] não existe implementação concorrente em `app/app-profissional`;
- [ ] `public/app-profissional` foi regenerado pelo build atual;
- [ ] proxy do host `app` entrega o bundle Vite;
- [ ] App Cliente continua em `app/app-cliente`;
- [ ] Painel/Admin Master continuam no Next.js.

## Banco

- [ ] migrations de produção aplicadas;
- [ ] `fn_validar_rls_critico()` validada;
- [ ] `fn_shell_resumo_painel()` existe;
- [ ] funções obrigatórias revisadas;
- [ ] nenhuma migration histórica foi apagada para remover feature;
- [ ] migration destrutiva, se houver, possui backup/rollback.

## Auth e tenant

- [ ] Painel: Supabase Auth + usuário/salão coerentes;
- [ ] App Cliente: login/cadastro/recuperação funcionam;
- [ ] App Profissional Vite: CPF/senha, session e logout funcionam;
- [ ] Admin Master: guard próprio;
- [ ] rotas mutáveis possuem guard explícito;
- [ ] teste cruzado salão A → salão B bloqueado.

## Dados sensíveis

- [ ] nenhum segredo no bundle Vite/Next client;
- [ ] nenhum token/chave em logs;
- [ ] CPF/e-mail/telefone minimizados em telemetria/IA;
- [ ] Service Role somente server-side;
- [ ] payloads de webhook/log revisados.

## Smoke

- [ ] site público;
- [ ] login SaaS;
- [ ] Painel principal;
- [ ] agenda;
- [ ] comanda;
- [ ] caixa/fechamento;
- [ ] estoque/comissão;
- [ ] App Cliente — login + reserva;
- [ ] App Profissional Vite — login + agenda + comandas;
- [ ] push cliente ↔ profissional;
- [ ] assinatura;
- [ ] Admin Master/saúde;
- [ ] webhook em ambiente seguro.

## Após deploy

- [ ] deployment Vercel `READY`;
- [ ] assets/chunks sem erro;
- [ ] PWA profissional atualizou o service worker;
- [ ] `/status` e probes sem regressão relevante;
- [ ] logs/webhooks acompanhados durante a janela inicial.