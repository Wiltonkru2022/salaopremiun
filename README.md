# SalãoPremium

SaaS multi-tenant para gestão de salões, barbearias e profissionais de beleza. O projeto reúne site, painel do salão, App Cliente, App Profissional, Admin Master, assinaturas, pagamentos, notificações, blog, automações e integrações em uma base principal Next.js.

## Arquitetura atual

```text
Navegador / PWA
      │
      ▼
Vercel / Next.js
      │
      ├── APIs e Server Actions
      ├── webhooks Asaas
      ├── Web Push / VAPID
      ├── e-mails Brevo
      └── rotas cron
      │
      ▼
Supabase
      ├── Postgres
      ├── Auth
      ├── Storage
      ├── pg_cron / Cron
      ├── pg_net
      ├── filas e jobs
      ├── telemetria
      ├── segurança
      └── incidentes / alertas
```

Não existe dependência de VPS auxiliar. APIs, jobs e processamento assíncrono são executados por Vercel + Supabase.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend/backend web | Next.js App Router, React, TypeScript |
| App Profissional | Vite/React PWA |
| Estilo | Tailwind CSS + componentes próprios |
| Banco principal | Supabase Postgres |
| Auth | Supabase Auth + sessões SSR |
| Storage | Supabase Storage |
| Blog | Supabase separado |
| E-mail | Brevo |
| Pagamentos | Asaas |
| Push | Web Push + VAPID + `web-push` |
| Jobs recorrentes | Supabase Cron/pg_cron + rotas cron Vercel |
| Deploy | Vercel |
| CI | GitHub Actions |

## Áreas principais

- Site público e cadastro.
- Painel do salão: agenda, caixa, clientes, serviços, profissionais, vendas, comissões e assinatura.
- App Cliente: salão, reservas, agenda, notificações, perfil e avaliações.
- App Profissional: agenda, clientes, comandas, suporte e notificações.
- Admin Master: saúde, segurança, relatórios, salões, planos, cobranças, tickets, campanhas, blog e configurações.

## Estrutura

```text
app/                        páginas, APIs, layouts e Server Actions
apps/app-profissional-vite/ PWA do profissional
components/                 componentes reutilizáveis
core/                       casos de uso e contratos de domínio
lib/                        infraestrutura e regras compartilhadas
services/                   serviços de negócio
scripts/                    build, auditorias e manutenção
supabase/                   migrations e configuração do banco principal
supabase-blog/              banco/contratos do blog separado
docs/                       documentação complementar
public/                     assets e bundles públicos
vercel.json                 configuração de crons/deploy
```

## Variáveis de ambiente

Use `.env.example` como referência. Nunca versione `.env` ou credenciais administrativas.

### Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` é a chave preferida para navegador/PWA. `NEXT_PUBLIC_SUPABASE_ANON_KEY` permanece apenas como alias de compatibilidade enquanto pontos legados são migrados. `SUPABASE_SERVICE_ROLE_KEY` é exclusivamente de backend.

### Brevo / trial

```env
BREVO_API_KEY=
BREVO_EMAIL_FROM=
CADASTRO_SALAO_EMAIL_FROM=
CADASTRO_SALAO_EMAIL_REPLY_TO=
TRIAL_EMAIL_FROM=
TRIAL_EMAIL_REPLY_TO=
```

O ciclo de trial roda diretamente pelo sistema: a rota cron consulta `assinaturas`, envia os avisos via Brevo e grava os marcadores de 3 dias, 1 dia, hoje e expirado no Supabase.

### Asaas

```env
ASAAS_BASE_URL=https://api.asaas.com/v3
ASAAS_API_KEY=
ASAAS_WEBHOOK_TOKEN=
```

O webhook Asaas é processado diretamente pelo Next.js/Vercel. Idempotência e persistência continuam no banco principal.

### Crons e segurança

```env
CRON_SECRET=
PASSWORD_REUSE_SECRET=
PROFISSIONAL_SESSION_SECRET=
```

Segurança é gravada em `eventos_sistema`, `security_login_attempts`, `user_security_status`, `incidentes_sistema` e `alertas_sistema` no Supabase principal.

### Web Push

```env
WEB_PUSH_PUBLIC_KEY=
WEB_PUSH_PRIVATE_KEY=
WEB_PUSH_SUBJECT=mailto:suporte@salaopremiun.com.br
```

O fluxo é:

```text
PWA -> PushSubscription -> Supabase -> job/cron -> Vercel -> web-push/VAPID -> navegador
```

## Domínios

| Domínio | Uso |
| --- | --- |
| `salaopremiun.com.br` | site público |
| `www.salaopremiun.com.br` | redirecionamento/site |
| `painel.salaopremiun.com.br` | painel e Admin Master |
| `login.salaopremiun.com.br` | autenticação |
| `cadastro.salaopremiun.com.br` | cadastro de salão |
| `assinatura.salaopremiun.com.br` | assinatura/planos |
| `app.salaopremiun.com.br` | apps/PWA |
| `blog.salaopremiun.com.br` | blog |

Não existe domínio de API ligado a servidor externo. As APIs públicas e internas fazem parte do deploy Next.js.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local
npm run dev
```

Validação mínima antes de publicar:

```bash
npm run lint
npm run typecheck
npm run build
```

Validação ampliada:

```bash
npm run launch:validate
```

## Build do App Profissional

`scripts/run-build.mjs` compila o PWA profissional antes do Next.js. Ele aceita:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Também aceita temporariamente os aliases `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `VITE_SUPABASE_ANON_KEY` e `VITE_SUPABASE_PUBLISHABLE_KEY`.

O GitHub Actions usa somente URL e publishable key para o bundle público. Chaves administrativas não pertencem ao CI de frontend.

## Banco, Auth e multi-tenancy

O identificador estrutural é `id_salao`. Qualquer nova tabela ou operação pertencente a um salão deve respeitar esse escopo.

Regras:

- mudanças de schema devem vir por migration;
- Service Role nunca deve chegar ao navegador;
- APIs precisam validar sessão/permissão no servidor;
- RLS deve ser usada onde o cliente acessa o Data API;
- App Cliente e App Profissional precisam respeitar status do salão, plano e permissões;
- o banco do blog é separado do banco principal.

## Jobs e automações

- `notification_jobs`: fila de notificações.
- `push_subscriptions`: dispositivos/navegadores inscritos.
- Supabase Cron: dispara processamento recorrente.
- Vercel: executa as rotas de processamento.
- `trial-alerts`: envia avisos de trial pela Brevo.
- `security-cleanup`: aplica retenção no banco principal.
- `renovar-assinaturas`: processa rotina comercial recorrente.

## Observabilidade

O sistema mantém telemetria no próprio Supabase:

- `eventos_sistema`
- `logs_sistema`
- `incidentes_sistema`
- `alertas_sistema`
- `health_checks_sistema`
- eventos de webhook e cron

O Admin Master usa esses dados para Saúde, Segurança e Relatórios.

## Integrações críticas

### Asaas

Assinaturas e cobranças são processadas pelo fluxo local. O webhook não depende de serviço intermediário.

### Brevo

Usado em recuperação de senha, recuperação e alteração de e-mail do App Cliente, boas-vindas, alertas de segurança, blog e avisos de trial.

### Google Calendar

A integração de calendário continua independente da autenticação por e-mail/senha e deve respeitar os recursos liberados pelo plano.

### Supabase Cron

Rotinas frequentes devem preferir funções SQL/pg_cron ou chamadas HTTP autenticadas para rotas Vercel, evitando manter processo permanente apenas para agendamento.

## Segurança

- bloqueios de usuário ficam em `user_security_status`;
- bloqueios de salão ficam no próprio salão;
- tentativas de login ficam em `security_login_attempts`;
- eventos de segurança entram em `eventos_sistema`;
- incidentes críticos podem gerar `incidentes_sistema`/`alertas_sistema`;
- limpeza de retenção é executada pelo cron local;
- Admin Master pode auditar e desbloquear sem depender de infraestrutura externa.

## Publicação

Fluxo recomendado:

1. criar branch;
2. executar lint, typecheck e build;
3. revisar migrations;
4. abrir PR;
5. validar preview Vercel quando necessário;
6. mergear em `main`;
7. confirmar deployment `READY` e logs de produção.
