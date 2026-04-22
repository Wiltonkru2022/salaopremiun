# Final Production Audit Checklist

## Antes do deploy

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run audit:database-contract`
- [ ] `npm run audit:service-role`
- [ ] `npm run audit:admin-actions`
- [ ] `npm run audit:admin-client-inventory`
- [ ] `npm run audit:admin-surface`
- [ ] `npm run audit:api-guards`
- [ ] `npm run audit:critical-routes`
- [ ] `npm run audit:no-wildcard-select`
- [ ] `npm run audit:architecture-boundaries`
- [ ] `npm run audit:launch-readiness`
- [ ] `npm run build`

## Banco

- [ ] Todas as migrations de producao foram aplicadas
- [ ] `fn_validar_rls_critico()` retorna RLS habilitado nas tabelas criticas
- [ ] `fn_shell_resumo_painel()` existe no schema `public`
- [ ] Funcoes obrigatorias do contrato do banco atualizadas em `docs/database-required-functions.md`

## Auth e tenant

- [ ] Todas as rotas novas em `app/api/*` possuem guard explicito ou motivo publico claro
- [ ] Nenhuma rota critica ficou sem autenticacao/tenant guard
- [ ] Recuperacao de senha redireciona para `login.salaopremiun.com.br`
- [ ] Cookies de auth seguem as mesmas regras de dominio de `proxy.ts`

## Dados sensiveis

- [ ] Nenhum fluxo de IA envia telefone, email, CPF ou PII desnecessaria
- [ ] Nao existem `select("*")` em consultas sensiveis
- [ ] Leitura privilegiada usa `runAdminOperation()` ou RPC adequada

## Smoke manual

- [ ] Login SaaS
- [ ] Recuperacao de senha
- [ ] Login profissional
- [ ] Painel principal
- [ ] Notificacoes do shell
- [ ] Agenda
- [ ] Comandas
- [ ] Caixa
- [ ] Assinatura
- [ ] Webhook/assinatura em staging
