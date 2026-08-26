# Produção e Deploy

Este documento descreve o caminho oficial de produção do SalãoPremium.

## Arquitetura de deploy

- Next.js e APIs: Vercel;
- App Profissional: Vite PWA compilado durante o build principal;
- banco: Neon;
- autenticação: Clerk;
- mídia e anexos: Cloudinary;
- pagamentos: Asaas;
- e-mail: Brevo;
- push: Web Push/VAPID;
- WhatsApp: Meta API quando configurada.

## App Profissional em produção

**Somente `apps/app-profissional-vite` é fonte de produção.**

`scripts/run-build.mjs` compila esse projeto e grava os assets em `public/app-profissional` antes do Next build. O proxy do host `app.salaopremiun.com.br` reescreve as rotas profissionais para o bundle Vite.

Não criar novamente páginas em `app/app-profissional`.

## Variáveis essenciais

Consulte `.env.example` para a lista integral.

### Neon

```env
NEON_DATABASE_URL=
NEON_ADMIN_DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Segurança/sessões

```env
CRON_SECRET=
PASSWORD_REUSE_SECRET=
PROFISSIONAL_SESSION_SECRET=
CLIENT_APP_RECOVERY_SECRET=
```

### Asaas

```env
ASAAS_BASE_URL=https://api.asaas.com/v3
ASAAS_API_KEY=
ASAAS_WEBHOOK_TOKEN=
```

### Brevo

```env
BREVO_API_KEY=
BREVO_EMAIL_FROM=
```

### Web Push

```env
WEB_PUSH_PUBLIC_KEY=
WEB_PUSH_PRIVATE_KEY=
WEB_PUSH_SUBJECT=
```

### Domínios

Revisar `APP_ROOT_HOST`, `APP_PAINEL_HOST`, `APP_PROFISSIONAL_HOST`, `APP_LOGIN_HOST`, `APP_CADASTRO_HOST`, `APP_ASSINATURA_HOST` e os equivalentes usados no ambiente.

## Build oficial

```bash
npm ci
npm run ci:validate
```

O `npm run build` já inclui:

1. preparação de mídia do cliente;
2. `npm ci` do Vite profissional;
3. build do Vite profissional;
4. typecheck principal;
5. Next build.

## Validações mínimas

```bash
npm run lint
npm run typecheck
npm run typecheck:professional
npm run audit:database-contract
npm run audit:admin-database-access
npm run audit:api-guards
npm run audit:critical-routes
npm run audit:architecture-boundaries
npm run audit:operational-coverage
npm run test:operational
npm run build
```

## Neon

- revisar `database/migrations`;
- executar dry-run quando aplicável;
- nunca apagar migration já aplicada para “remover” uma feature;
- validar RLS e funções obrigatórias;
- manter Service Role somente no servidor;
- conferir backup/restore antes de migrations destrutivas.

### Editor removido

A migration histórica do editor permanece no histórico. Caso as tabelas/bucket do editor precisem ser eliminados do banco de produção, criar uma nova migration de remoção somente após backup e confirmação de que não existem dados necessários.

## Asaas

- webhook: `/api/webhooks/asaas`;
- token precisa coincidir com o provedor;
- separar sandbox e produção;
- validar idempotência;
- monitorar eventos com erro e reconciliação.

## Crons

Rotas cron exigem `CRON_SECRET` e devem registrar execução/resultado. Jobs não podem duplicar efeitos de webhook sem idempotência.

## Smoke após deploy

1. site público;
2. login do painel;
3. dashboard;
4. App Cliente: login + reserva;
5. App Profissional Vite: login + agenda + comandas;
6. caixa/fechamento;
7. assinatura;
8. webhook em ambiente apropriado;
9. Admin Master/saúde;
10. push e e-mail quando configurados.

## Rollback

- código: rollback de deployment/commit;
- banco: não “voltar” migration apagando arquivo; aplicar migration corretiva;
- incidentes financeiros: preservar logs/idempotência antes de qualquer reparo;
- Service Worker/PWA: considerar cache de versões anteriores e testar atualização.

## Regra de promoção

Nenhum release deve ser considerado pronto apenas porque o build passou. É necessário combinar build, auditorias, migrations, smoke e evidência operacional do deployment atual.
