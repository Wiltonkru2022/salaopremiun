# SalãoPremium

> Plataforma SaaS multi-tenant para salões, barbearias e profissionais de beleza, com gestão operacional, App Cliente, App Profissional PWA, pagamentos, notificações, assinaturas e observabilidade em uma única arquitetura.

## Visão geral

O SalãoPremium é composto por quatro superfícies principais que compartilham o mesmo backend de negócio e o mesmo banco principal, mas possuem responsabilidades e experiências diferentes.

| Superfície | Tecnologia oficial | Código fonte | Função |
| --- | --- | --- | --- |
| Site + Painel do salão | Next.js / React / TypeScript | `app/`, `components/`, `lib/`, `services/` | Gestão completa do salão |
| App Cliente | Next.js PWA | `app/app-cliente`, `components/client-app` | Descoberta, reservas, agenda, perfil e avaliações |
| **App Profissional** | **Vite + React PWA** | **`apps/app-profissional-vite`** | Agenda, clientes, serviços, comandas, comissões e rotina do profissional |
| Admin Master | Next.js | `app/(admin-master)` | Administração, saúde, segurança, planos, cobranças e suporte |

### Fonte da verdade do App Profissional

**O único App Profissional oficial é o Vite em `apps/app-profissional-vite`.**

O antigo App Profissional implementado como páginas Next.js em `app/app-profissional` foi removido para evitar duas aplicações concorrendo pela mesma URL e gerar manutenção duplicada. O build oficial do Vite é publicado em `public/app-profissional` e o proxy do domínio `app.salaopremiun.com.br` reescreve as rotas do profissional para esse bundle.

```text
apps/app-profissional-vite
        │
        │ npm run build:professional
        ▼
public/app-profissional
        │
        ▼
/app-profissional/  →  PWA do profissional
```

> `apps/sistema-salao-premiun-vite` não é a implementação oficial do App Profissional e não deve ser usado como fonte de produção dessa superfície.

## Arquitetura

```text
                         ┌──────────────────────────┐
                         │        Usuários          │
                         └────────────┬─────────────┘
                                      │
           ┌──────────────────────────┼───────────────────────────┐
           │                          │                           │
           ▼                          ▼                           ▼
┌────────────────────┐    ┌────────────────────┐      ┌────────────────────┐
│ Site / Painel      │    │ App Cliente       │      │ App Profissional   │
│ Next.js            │    │ Next.js PWA       │      │ Vite + React PWA   │
└─────────┬──────────┘    └─────────┬──────────┘      └─────────┬──────────┘
          │                         │                           │
          └─────────────────────────┼───────────────────────────┘
                                    ▼
                         ┌──────────────────────────┐
                         │ Next.js / Vercel        │
                         │ APIs + Server Actions   │
                         │ Webhooks + Cron         │
                         └────────────┬─────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              ┌───────────┐     ┌───────────┐     ┌─────────────┐
              │ Supabase  │     │   Asaas   │     │ Brevo/Meta  │
              │ DB/Auth/  │     │ pagamentos│     │ e-mail/WA   │
              │ Storage   │     │ webhooks  │     │             │
              └───────────┘     └───────────┘     └─────────────┘
```

Não existe dependência obrigatória de VPS auxiliar para manter o sistema funcionando. A arquitetura de produção usa Vercel, Supabase e os provedores integrados.

## Stack principal

| Camada | Tecnologia |
| --- | --- |
| Web / backend | Next.js 16, React 19, TypeScript |
| App Profissional | Vite, React 18, TypeScript, `vite-plugin-pwa` |
| UI | Tailwind CSS, Lucide e componentes próprios |
| Banco | Supabase PostgreSQL |
| Auth do painel | Supabase Auth + sessão server-side |
| Sessão profissional | API própria + cookie assinado com `PROFISSIONAL_SESSION_SECRET` |
| Storage | Supabase Storage |
| Pagamentos | Asaas |
| E-mail | Brevo |
| WhatsApp | Meta WhatsApp API, quando configurada |
| Push | Web Push + VAPID + `web-push` |
| Jobs | Supabase Cron/pg_cron + rotas Vercel |
| Deploy | Vercel |
| CI | GitHub Actions |
| Testes | Vitest + Playwright + suítes E2E próprias |

## Módulos do produto

### Painel do salão

- dashboard e indicadores;
- agenda e bloqueios;
- clientes;
- profissionais e permissões;
- catálogo de serviços;
- produtos e estoque;
- comandas e vendas;
- caixa e pagamentos;
- comissões;
- campanhas e cupons;
- relatórios;
- assinatura e limites de plano;
- integrações e configurações.

### App Cliente

- exploração de salões elegíveis;
- perfil completo do salão;
- profissionais, serviços, portfólio e avaliações;
- reserva online em etapas;
- favoritos;
- agendamentos e reagendamento/cancelamento quando permitido;
- notificações;
- perfil do cliente;
- cadastro com nome, nascimento, CPF, WhatsApp e e-mail opcional;
- login com CPF + data de nascimento;
- recuperação/alteração de e-mail com validação de identidade.

### App Profissional — Vite PWA

A aplicação oficial fica em `apps/app-profissional-vite` e contém, entre outras telas:

- início;
- agenda;
- clientes;
- serviços;
- comandas;
- cupons;
- comissão;
- avaliações;
- notificações;
- perfil;
- configurações;
- suporte e páginas auxiliares;
- suporte a instalação PWA e cache/offline controlado.

O frontend Vite conversa com APIs protegidas em `/api/app-profissional/*`. Credenciais administrativas do Supabase não entram no bundle público.

### Admin Master

- visão global dos salões;
- planos e assinaturas;
- cobranças e webhooks;
- tickets e suporte;
- saúde operacional;
- incidentes e alertas;
- segurança;
- relatórios;
- gestão de recursos administrativos.

## Estrutura do repositório

```text
app/
├── (painel)/                    # Painel do salão
├── (admin-master)/              # Administração global
├── app-cliente/                 # App Cliente
├── api/                         # APIs do sistema, inclusive App Profissional
└── ...                          # Site, autenticação, assinatura e rotas públicas

apps/
└── app-profissional-vite/       # ÚNICO App Profissional oficial

components/
├── client-app/                  # UI do App Cliente
└── ...                          # UI do painel/site

core/                            # entidades, contratos e casos de uso
lib/                             # infraestrutura e regras compartilhadas
services/                        # serviços de negócio
scripts/                         # build, auditorias, E2E e manutenção
supabase/migrations/             # histórico imutável de migrations
supabase-blog/                   # contratos do blog separado
docs/                            # documentação canônica e histórica
public/app-profissional/         # bundle gerado do Vite PWA
```

## Editor de imagens removido

O antigo editor visual acessado por `/salaopremiuneditor`, seus assets e o endpoint Pexels foram removidos do produto. A migration histórica `20260519210000_editor_ecossistema.sql` permanece versionada porque migrations já aplicadas não devem ser apagadas do histórico. Se no futuro for necessário remover também tabelas/bucket do banco, isso deve ser feito por **nova migration destrutiva, revisada e com backup**, nunca apagando a migration antiga.

## Autenticação e isolamento

O sistema possui contextos distintos:

- **Painel/Admin:** autenticação baseada em Supabase Auth e vínculo com `usuarios`/salão.
- **App Cliente:** identidade e sessão próprias do App Cliente; login atual por CPF + data de nascimento.
- **App Profissional:** sessão própria validada por APIs `/api/app-profissional/auth/*` e escopo de profissional/salão.

Regras obrigatórias:

1. toda operação pertencente a um salão deve respeitar `id_salao`;
2. autorização do frontend é somente UX — a autorização real acontece no servidor/RPC/policy;
3. `SUPABASE_SERVICE_ROLE_KEY` nunca pode chegar ao navegador;
4. RLS deve ser mantida nas superfícies que acessam o Data API;
5. operações financeiras e mutações sensíveis precisam de validação server-side e idempotência quando aplicável.

## Variáveis de ambiente

A lista completa e atual fica em `.env.example`.

### Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

A publishable key é pública por definição e pode ser usada nos clientes autorizados. A Service Role é exclusivamente server-side.

### App Profissional Vite

O build aceita as variáveis públicas abaixo e também os aliases equivalentes definidos pelo script de build:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_NEXT_APP_ORIGIN=
```

Em produção, `scripts/run-build.mjs` reaproveita `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` para montar o bundle profissional.

### Pagamentos, e-mail e segurança

```env
ASAAS_BASE_URL=https://api.asaas.com/v3
ASAAS_API_KEY=
ASAAS_WEBHOOK_TOKEN=
BREVO_API_KEY=
CRON_SECRET=
PASSWORD_REUSE_SECRET=
PROFISSIONAL_SESSION_SECRET=
CLIENT_APP_RECOVERY_SECRET=
```

### Web Push

```env
WEB_PUSH_PUBLIC_KEY=
WEB_PUSH_PRIVATE_KEY=
WEB_PUSH_SUBJECT=mailto:suporte@salaopremiun.com.br
```

## Desenvolvimento

### Aplicação Next.js

```bash
npm install
cp .env.example .env.local
npm run dev
```

### App Profissional Vite isolado

```bash
npm --prefix apps/app-profissional-vite install
npm --prefix apps/app-profissional-vite run dev
```

O Vite usa porta própria e faz proxy de `/api` para o Next local através de `VITE_NEXT_APP_ORIGIN` quando configurado.

## Build

O comando oficial é:

```bash
npm run build
```

O fluxo de `scripts/run-build.mjs` é:

```text
preparar mídia do App Cliente
        ↓
build do apps/app-profissional-vite
        ↓
gerar public/app-profissional
        ↓
typecheck
        ↓
Next.js build
```

Comandos úteis:

```bash
npm run typecheck:professional
npm run build:professional
npm run lint
npm run typecheck
npm run ci:validate
npm run launch:validate
```

## Testes e auditorias

O projeto possui auditorias específicas para:

- guards de API;
- uso de Service Role;
- rotas críticas;
- contrato do banco/RPCs;
- arquitetura;
- cobertura operacional;
- ações do Admin Master;
- inventário de superfícies;
- seleção de dados sensíveis;
- segurança de dependências.

E2E disponíveis incluem proxy/domínios, fluxo SaaS, App Cliente + App Profissional, resiliência de agendamento, offline profissional, sinal/pagamento e status operacional.

## Integrações

### Asaas

Usado em assinaturas, cobranças e webhooks. O processamento crítico permanece no backend e deve ser idempotente.

### Brevo

Usado em e-mails transacionais, recuperação, avisos e comunicações do produto.

### Meta WhatsApp API

Opcional. Tokens e `phone_number_id` são somente server-side.

### Google Calendar

Integração do salão/painel, independente do App Profissional Vite. OAuth do profissional está desativado; veja `docs/app-profissional-google-oauth.md`.

### Web Push

```text
PWA → PushSubscription → Supabase → jobs/cron → Vercel → VAPID → navegador
```

Cliente e profissional possuem subscriptions separadas por audiência/dispositivo.

## Domínios

| Host | Uso esperado |
| --- | --- |
| `salaopremiun.com.br` | site público |
| `www.salaopremiun.com.br` | site/redirect |
| `login.salaopremiun.com.br` | login do painel |
| `painel.salaopremiun.com.br` | painel e Admin Master |
| `cadastro.salaopremiun.com.br` | cadastro de salão |
| `assinatura.salaopremiun.com.br` | assinatura/planos |
| `app.salaopremiun.com.br` | App Cliente e App Profissional |
| `blog.salaopremiun.com.br` | blog |

O proxy centraliza roteamento e garante que o host do App Profissional entregue o bundle Vite.

## Banco e migrations

- `supabase/migrations` é histórico versionado e não deve ser reescrito depois de aplicado.
- mudanças de schema devem entrar como nova migration;
- tabelas multi-tenant devem ser auditadas por `id_salao` e RLS;
- funções críticas são verificadas por `npm run audit:database-contract`;
- backups operacionais estão documentados em `docs/backup-operacional.md`.

## Observabilidade

A saúde operacional utiliza catálogo versionado, probes seguros, incidentes, alertas, eventos e checks persistidos no Supabase. Ausência de erro não é tratada automaticamente como prova de saúde.

Principais comandos:

```bash
npm run audit:operational-coverage
npm run test:operational
npm run e2e:status
```

## Deploy e release

Fluxo recomendado:

1. revisar migrations e mudanças destrutivas;
2. `npm run ci:validate`;
3. testar Preview/Staging;
4. executar os E2E necessários;
5. mergear em `main`;
6. confirmar build do App Profissional Vite e Next.js;
7. confirmar deployment Vercel `READY`;
8. executar smoke de produção e acompanhar saúde/webhooks.

## Documentação

Comece por [`docs/README.md`](docs/README.md). Os principais documentos são:

- [`docs/system-map.md`](docs/system-map.md) — mapa operacional;
- [`docs/app-cliente.md`](docs/app-cliente.md) — App Cliente;
- [`docs/app-profissional.md`](docs/app-profissional.md) — App Profissional Vite;
- [`docs/painel.md`](docs/painel.md) — Painel e Admin Master;
- [`docs/auth.md`](docs/auth.md) — autenticação e sessões;
- [`docs/producao.md`](docs/producao.md) — produção e deploy;
- [`docs/production-checklists.md`](docs/production-checklists.md) — checklist de release;
- [`docs/operational-health.md`](docs/operational-health.md) — saúde operacional;
- [`docs/web-push.md`](docs/web-push.md) — notificações push;
- [`docs/lgpd-security-review.md`](docs/lgpd-security-review.md) — segurança/LGPD.

---

**Regra de manutenção:** quando a arquitetura mudar, atualize primeiro este README e `docs/README.md`, depois os documentos específicos. Não mantenha duas implementações oficiais para a mesma superfície.