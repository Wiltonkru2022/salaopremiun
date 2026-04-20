# Checklist de Go-Live do SalaoPremium

Este checklist deve ser revisado antes de vender assinaturas em producao.

## 1. Ambientes e segredos

- Confirmar `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` na Vercel.
- Confirmar `SUPABASE_SERVICE_ROLE_KEY` somente no ambiente server da Vercel.
- Confirmar `ASAAS_API_KEY`, `ASAAS_BASE_URL` e `ASAAS_WEBHOOK_TOKEN`.
- Confirmar `CRON_SECRET`.
- Confirmar `PROFISSIONAL_SESSION_SECRET`.
- Confirmar `OPENAI_API_KEY` se o suporte do app profissional estiver ativo.
- Confirmar `APP_BASE_DOMAIN` e overrides de host se a producao nao usar o padrao do proxy.
- Rodar `npm run validate` antes do deploy.
- Rodar `npm run validate:release` contra staging ou producao antes de liberar venda.

## 2. Dominios e proxy

- `salaopremiun.com.br` deve abrir site/Admin Master.
- `/admin-master/login` deve abrir sem loop no dominio raiz.
- `/api/webhooks/asaas` nunca pode redirecionar.
- Subdominios esperados no proxy: `login`, `painel`, `app`, `cadastro`, `assinatura`.
- Se algum subdominio nao for usado em producao, remover do DNS ou manter redirecionamento testado.
- Rodar `npm run e2e:proxy`.

## 3. Supabase

- Rodar `npx supabase db push --dry-run`.
- Confirmar que o banco remoto esta atualizado.
- Confirmar backups automaticos do projeto Supabase.
- Testar restore em ambiente separado antes de vender em volume.
- Confirmar RLS em tabelas multi-tenant.
- Rodar `npm run audit:service-role`.

## 4. Asaas e assinatura

- Usar sandbox para homologar `PAYMENT_CREATED`.
- Homologar `PAYMENT_CONFIRMED`.
- Homologar `PAYMENT_RECEIVED`.
- Homologar `PAYMENT_OVERDUE`.
- Homologar cancelamento/estorno/falha.
- Homologar assinatura recorrente com `subscription`.
- Confirmar que o webhook Asaas esta cadastrado como `https://salaopremiun.com.br/api/webhooks/asaas`.
- Rodar o fluxo mutavel apenas com ambiente correto:

```powershell
$env:E2E_ALLOW_MUTATION="1"
$env:E2E_RUN_ASAAS_CHECKOUT="1"
$env:E2E_RUN_ASAAS_WEBHOOK="1"
$env:E2E_RUN_MULTI_TENANT="1"
npm run e2e:sales
```

## 5. Multi-tenant

- Criar dois saloes de teste.
- Entrar como usuario do salao A.
- Tentar acessar/alterar dados do salao B.
- Resultado esperado: `403` ou nenhum dado retornado.
- Validar painel, API, app profissional e rotas de assinatura.

## 6. Admin Master

- Acessar `https://salaopremiun.com.br/admin-master/login`.
- Validar usuario liberado em `admin_master_usuarios`.
- Abrir `Saude operacional`.
- Confirmar webhooks recentes.
- Confirmar checkouts travados.
- Confirmar saloes bloqueados.
- Confirmar cron e alertas.
- Rodar `npm run audit:admin-actions`.

## 7. LGPD e seguranca

- Nao registrar senha em log.
- Nao enviar CPF/CNPJ completo para logs desnecessarios.
- Evitar payload sensivel completo em `logs_sistema`.
- Conferir dados enviados para OpenAI no suporte do app profissional.
- Validar permissao de usuarios internos por nivel.
- Validar que profissionais veem apenas dados do proprio salao.

## 8. Operacao de venda

- Planos e precos conferem com pagina publica.
- Limites de usuarios/profissionais conferem com `planos_saas`.
- Termos de uso e politica de privacidade publicados.
- Usuario Admin Master principal criado.
- Processo de suporte definido para falha de pagamento.
- Processo de rollback Vercel identificado.
- Processo de contato com cliente inadimplente definido.
