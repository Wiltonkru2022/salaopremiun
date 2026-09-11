# App Profissional — Vite PWA

## Regra principal

**Existe uma única implementação oficial do App Profissional: `apps/app-profissional-vite`.**

A antiga implementação Next.js em `app/app-profissional` foi removida para evitar conflito de rotas, comportamento divergente e correções aplicadas no app errado.

## Arquitetura

```text
apps/app-profissional-vite
├── src/App.tsx
├── src/contexts/AuthContext.tsx
├── src/hooks/useProfissionalData.ts
├── src/components/
├── src/pages/
├── src/sw.ts
└── vite.config.ts
        │
        │ build
        ▼
public/app-profissional
        │
        ▼
app.salaopremiun.com.br/app-profissional/
```

`vite.config.ts` usa `base: /app-profissional/`, gera o bundle em `public/app-profissional` e registra PWA/service worker.

O `proxy.ts` reconhece o host do app e reescreve a superfície profissional para o `index.html` do bundle Vite. Portanto, páginas Next.js concorrentes em `app/app-profissional` não são necessárias nem desejadas.

## Build

Build isolado:

```bash
npm run typecheck:professional
npm run build:professional
```

Build completo do produto:

```bash
npm run build
```

`scripts/run-build.mjs` compila o Vite PWA antes do Next.js. Isso impede publicar uma versão nova do backend com assets profissionais antigos.

## Desenvolvimento local

Terminal 1:

```bash
npm run dev
```

Terminal 2:

```bash
npm --prefix apps/app-profissional-vite install
npm --prefix apps/app-profissional-vite run dev
```

Para o proxy de API do Vite, configure quando necessário:

```env
VITE_NEXT_APP_ORIGIN=http://localhost:3000
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## Autenticação

O Vite usa APIs próprias:

```text
POST /api/app-profissional/auth/login
GET  /api/app-profissional/auth/session
POST /api/app-profissional/auth/logout
```

O frontend envia CPF + senha para a API e recebe somente o contexto permitido do profissional. A sessão é persistida por cookie server-side assinado; `PROFISSIONAL_SESSION_SECRET` nunca pode entrar no bundle.

A autenticação do profissional é separada do Supabase Auth usado pelo painel administrativo.

## Escopo e autorização

Toda operação precisa confirmar:

- sessão profissional válida;
- profissional ativo;
- salão correto;
- status/plano do salão quando aplicável;
- permissões específicas do profissional;
- `id_salao` e `id_profissional` coerentes com a sessão.

A UI pode esconder recursos, mas a segurança precisa ser aplicada novamente na API/RPC.

## Telas oficiais

O Vite atual possui superfícies para:

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
- suporte;
- dúvidas;
- instalação;
- privacidade.

## Dados e cache

`useProfissionalData` centraliza carregamento e ações. O app possui cache/offline controlado e service worker próprio. Dados financeiros, status de comanda, agenda e permissões precisam ser reconciliados com o backend ao voltar online.

Nunca tratar cache local como fonte definitiva para:

- saldo/financeiro;
- comissão;
- fechamento de comanda;
- disponibilidade;
- permissão;
- status de salão/assinatura.

## PWA

O manifest e o service worker são gerados pelo Vite. O antigo manifest Next específico do profissional foi removido.

Validar:

- `start_url` e `scope` em `/app-profissional/`;
- ícones 192/512;
- atualização automática do service worker;
- cache sem prender chunks antigos;
- instalação Android/iOS;
- push com o app fechado.

## Web Push

O profissional registra subscription pelo fluxo de Web Push. Eventos relevantes incluem novo agendamento, alterações de agenda e notificações operacionais autorizadas.

## Segurança do Supabase no Vite

O bundle pode conter somente URL pública e publishable/anon key. Isso não substitui RLS e guards de API.

Nunca colocar no Vite:

- `SUPABASE_SERVICE_ROLE_KEY`;
- `PROFISSIONAL_SESSION_SECRET`;
- `ASAAS_API_KEY`;
- `BREVO_API_KEY`;
- token Meta WhatsApp;
- qualquer segredo de cron/webhook.

## OAuth Google

Google OAuth para login do profissional está desativado. O documento `app-profissional-google-oauth.md` é somente histórico.

## Testes

```bash
npm run typecheck:professional
npm run build:professional
npm run e2e:client-professional
npm run e2e:professional-offline
```

Smoke manual obrigatório:

1. login por CPF/senha;
2. sessão restaurada após recarregar;
3. agenda;
4. criação/edição permitida de cliente/serviço;
5. comanda e status após fechamento no caixa;
6. comissão;
7. notificações;
8. logout;
9. offline e retorno online;
10. instalação/atualização do PWA.