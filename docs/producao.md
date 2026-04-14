# Checklist de Produção

Use este checklist antes de publicar ou trocar o ambiente de produção.

## Variáveis Obrigatórias

- `NEXT_PUBLIC_SUPABASE_URL`: URL pública do projeto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave anon pública do Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: chave service role, somente no servidor.
- `ASAAS_BASE_URL`: URL base da API Asaas. Produção: `https://api.asaas.com/v3`.
- `ASAAS_API_KEY`: chave privada da API Asaas.
- `ASAAS_WEBHOOK_TOKEN`: token validado pelo webhook Asaas.
- `OPENAI_API_KEY`: chave usada pelo suporte inteligente.
- `CRON_SECRET`: segredo usado em `/api/cron/renovar-assinaturas`.
- `PASSWORD_REUSE_SECRET`: segredo para hash de reuso de senha por salão.
- `PROFISSIONAL_SESSION_SECRET`: segredo HMAC dos cookies do app profissional.
- `NEXT_PUBLIC_APP_URL`: URL pública do app.

## Git e Arquivos Locais

- `.env`, `.env.local`, `.cloudflared` e `tsconfig.tsbuildinfo` não devem ser versionados.
- Caso algum segredo tenha sido versionado no passado, rotacione a chave no provedor correspondente.
- Não publique arquivos de túnel local, certificado ou executáveis auxiliares.

## Supabase

- Conferir se as tabelas multi-tenant usam `id_salao`.
- Conferir RLS/policies nas tabelas usadas pelo client.
- Manter `SUPABASE_SERVICE_ROLE_KEY` apenas em rotas server-side.
- Validar que ações administrativas verificam usuário, salão, status e nível.

## Asaas

- Configurar o webhook para `/api/webhooks/asaas`.
- Enviar o header esperado pelo sistema: `asaas-access-token` ou `access_token`.
- Usar o mesmo valor de `ASAAS_WEBHOOK_TOKEN` no painel Asaas e no ambiente do app.
- Conferir `ASAAS_BASE_URL` antes de trocar sandbox por produção.

## Cron

- Chamar `/api/cron/renovar-assinaturas` com header:

```http
Authorization: Bearer <CRON_SECRET>
```

- Rodar em uma agenda diária ou mais frequente, conforme regra comercial.
- Monitorar respostas com `ok: false` para salões sem customer, plano inválido ou cobrança pendente.

## Validação Final

```bash
npm run lint
npm run typecheck
npm run build
```

Fluxos manuais recomendados:

- Criar salão.
- Login no painel.
- Iniciar trial.
- Gerar cobrança PIX/boleto/cartão.
- Receber webhook Asaas.
- Login no app profissional.
- Abrir suporte inteligente.
- Criar, editar e excluir usuário como admin.
