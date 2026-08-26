# App Profissional — Google OAuth

> **Status: DESATIVADO / documento histórico.**

O App Profissional oficial é o Vite em `apps/app-profissional-vite` e atualmente usa autenticação própria por CPF + senha através de `/api/app-profissional/auth/*`.

## Decisão atual

Google OAuth **não** é um método de login do App Profissional.

Motivos:

- o painel já utiliza Neon Auth e possui contexto administrativo diferente;
- o profissional possui sessão e permissões próprias;
- compartilhar o mesmo fluxo de Auth sem separação forte pode misturar sessões e superfícies;
- a implementação Next antiga do profissional foi removida.

As antigas rotas OAuth em `app/app-profissional/...` não existem mais e não devem ser recriadas a partir de documentação antiga.

## Google Calendar

A integração Google Calendar do painel continua sendo outro recurso, com suas próprias rotas e credenciais. Não confundir Google Calendar com login Google do profissional.

## Se OAuth profissional voltar no futuro

Exigir uma proposta técnica antes de implementar:

1. definir se haverá provedor/projeto Auth separado ou estratégia de sessão isolada;
2. definir callback canônico no domínio do app;
3. impedir que login profissional crie/contamine sessão administrativa do painel;
4. mapear conta Google para `id_profissional` + `id_salao` de forma segura;
5. revisar logout/revogação;
6. adicionar rate limit, auditoria e logs sanitizados;
7. testar isolamento entre dois salões;
8. atualizar Vite, APIs, proxy, `.env.example`, documentação e E2E no mesmo PR.

Até essa revisão existir, a regra é simples: **App Profissional = CPF + senha + sessão própria.**