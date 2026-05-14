# SalaoPremium

Sistema SaaS para gestão de salões, barbearias e profissionais de beleza. O projeto reúne painel do salão, App Cliente, App Profissional, Admin Master, assinaturas, notificações, blog, automações e integrações externas em uma única base Next.js.

Este README é o guia principal para manutenção, publicação, migração de banco/Auth, deploy em VPS e configuração de DNS/proteção.

Última atualização: 14/05/2026.

## Visão Geral

O SalaoPremium é multi-tenant. Quase tudo no sistema gira em torno de `id_salao`, e essa regra precisa ser preservada em qualquer alteração.

Áreas principais:

- **Site público**: página inicial, planos, cadastro e rotas públicas.
- **Painel do Salão**: agenda, caixa, clientes, serviços, profissionais, vendas, comissões, perfil, assinatura e configurações.
- **App Cliente**: descoberta de salões, página do salão, reservas, agenda, notificações, perfil, avaliações e recibos.
- **App Profissional**: agenda do profissional, comandas, clientes, avaliações, perfil e notificações.
- **Admin Master**: saúde do sistema, salões, assinaturas, cobranças, planos, recursos, logs, tickets, campanhas, WhatsApp, blog, feature flags e configurações globais.
- **Blog**: usa outro projeto Supabase. Não misture nem apague dados do blog ao limpar/migrar o banco principal.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend e backend web | Next.js App Router, React, TypeScript |
| Estilo | Tailwind CSS, componentes próprios, Radix/shadcn quando útil |
| Banco principal | Supabase Postgres |
| Auth principal | Supabase Auth + sessões SSR |
| Storage | Supabase Storage |
| Blog | Supabase separado do projeto principal |
| E-mail transacional | Resend |
| Pagamentos | Asaas |
| Push/Web Push | VAPID + tabelas de notificações |
| Agendamentos automáticos | Supabase Cron/pg_cron/pg_net e rotas cron |
| Deploy principal | Vercel |
| Testes/auditorias | ESLint, TypeScript, scripts de auditoria, Playwright |

## Estrutura do Projeto

```txt
app/                      Rotas Next.js, páginas, layouts, APIs e Server Actions
components/               Componentes reutilizáveis de UI
lib/                      Regras de domínio, clientes Supabase, planos, segurança e utilitários
services/                 Serviços de negócio compartilhados
scripts/                  Auditorias, backups, builds e validações
supabase/                 Migrations e configuração do banco principal
supabase-blog/            Contratos/migrations do blog separado
docs/                     Documentação complementar
public/                   Assets públicos, ícones, manifest e imagens
proxy.ts                  Roteamento por domínio/subdomínio e proteção de sessão
vercel.json               Crons e configuração de deploy
```

Antes de alterar código Next.js, leia a documentação local da versão instalada em `node_modules/next/dist/docs/`, conforme regra do `AGENTS.md`. Este projeto usa Next.js recente e pode ter diferenças importantes em relação a versões antigas.

## Domínios e Rotas

| Domínio | Uso |
| --- | --- |
| `salaopremiun.com.br` | Site público e App Cliente |
| `www.salaopremiun.com.br` | Redirecionamento/site público |
| `painel.salaopremiun.com.br` | Painel do Salão e Admin Master |
| `login.salaopremiun.com.br` | Login, recuperação e atualização de senha |
| `cadastro.salaopremiun.com.br` | Cadastro oficial de salão em `/cadastro-salao` |
| `assinatura.salaopremiun.com.br` | Páginas de planos/assinatura quando isoladas |
| `app.salaopremiun.com.br` | App Profissional |
| `blog.salaopremiun.com.br` | Blog público |
| `api.salaopremiun.com.br` | API auxiliar na Oracle VPS |

O roteamento por domínio fica em `proxy.ts` e em `lib/proxy/host-rules.ts`. Ao mudar domínio, subdomínio ou proxy, teste login, cadastro, painel, App Cliente, App Profissional e Admin Master.

### Canonical e SEO por domínio

- A URL oficial do cadastro é `https://cadastro.salaopremiun.com.br/cadastro-salao`.
- A rota `https://salaopremiun.com.br/cadastro-salao` deve redirecionar com 301 para a URL oficial.
- O sitemap principal deve publicar a URL oficial do cadastro no subdomínio.
- Páginas privadas, login, painel, Admin Master, App Cliente e App Profissional devem ficar fora do índice público.
- Rotas de teste, salões de teste e posts automáticos não devem entrar no sitemap.
- A home usa schema `Organization`/`WebSite` com logo pública para ajudar o Google a atualizar identidade visual.

## Variáveis de Ambiente

Use `.env.example` como referência. Nunca commite `.env`, `.env.local` ou chaves reais.

Grupos principais:

### Supabase principal

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Uso:

- `NEXT_PUBLIC_*`: pode ir para o navegador.
- `SUPABASE_SERVICE_ROLE_KEY`: somente servidor. Nunca usar em Client Component.

### Supabase do blog

```env
BLOG_SUPABASE_URL=
BLOG_SUPABASE_ANON_KEY=
BLOG_SUPABASE_SERVICE_ROLE_KEY=
```

O blog fica em outro projeto. Ao limpar ou migrar o banco principal, não apague o banco do blog.

### Resend

```env
RESEND_API_KEY=
BLOG_WEBHOOK_SECRET=
BLOG_EMAIL_FROM=
PASSWORD_RECOVERY_EMAIL_FROM=
CADASTRO_SALAO_EMAIL_FROM=
```

Remetentes esperados:

- Newsletter/blog: `novidades@salaopremiun.com.br`
- Recuperação de acesso: `recuperar@salaopremiun.com.br`
- Boas-vindas/cadastro: `boasvindas@salaopremiun.com.br`

### Segurança, cron e integrações

```env
CRON_SECRET=
ASAAS_API_KEY=
ASAAS_WEBHOOK_TOKEN=
PASSWORD_REUSE_SECRET=
PROFISSIONAL_SESSION_SECRET=
WEB_PUSH_PUBLIC_KEY=
WEB_PUSH_PRIVATE_KEY=
WEB_PUSH_SUBJECT=mailto:suporte@salaopremiun.com.br
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=
ORACLE_VPS_API_URL=https://api.salaopremiun.com.br
ORACLE_VPS_API_TOKEN=
```

Essas chaves protegem rotas internas, webhooks, notificações e fluxos sensíveis.

### Google Calendar e login com Google

```env
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=https://painel.salaopremiun.com.br/api/integracoes/google-calendar/callback
```

Regras atuais:

- O Google Calendar é integração de agenda, não substitui o login por e-mail/senha.
- A conexão da agenda fica no Perfil do Salão.
- A sincronização automática só deve ser liberada para plano Pro, Premium ou teste grátis ativo.
- Se o salão estiver no Básico, o botão na agenda deve informar que o recurso está nos planos Pro/Premium.
- Login com Google é separado da agenda. Para entrar com Google, o usuário precisa ter vinculado o login Google antes.
- Remover login com Google deve desvincular apenas a identity/provider Google do usuário Supabase, sem apagar `auth.users`.
- Desconectar Google Calendar deve remover tokens de agenda e revogar a integração da agenda, sem mexer no login por e-mail/senha.

## Rodando Localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra:

- Site/App Cliente: `http://localhost:3000`
- Painel: depende do host configurado; em local use a rota correspondente ou ajuste hosts locais se precisar testar subdomínios.

## Comandos Importantes

| Comando | Quando usar |
| --- | --- |
| `npm run dev` | Desenvolvimento local |
| `npm run build` | Build de produção |
| `npm run start` | Rodar build localmente |
| `npm run lint` | Validar ESLint |
| `npm run typecheck` | Validar TypeScript |
| `npm run check` | Lint + TypeScript |
| `npm run launch:validate` | Validação forte antes de publicar |
| `npm run backup:all:safe` | Backup local seguro |
| `npm run backup:db:schema` | Backup do schema |
| `npm run backup:db:data` | Backup dos dados |
| `npm run db:audit` | Auditoria de banco |
| `npm run audit:database-contract` | Verifica contrato do banco |
| `npm run audit:admin-surface` | Auditoria do Admin Master |
| `npm run audit:launch-readiness` | Prontidão para publicação |
| `npm run e2e:playwright` | Testes E2E Playwright |

Antes de publicar, rode pelo menos:

```bash
npm run lint
npm run typecheck
npm run build
```

Para uma checagem mais forte:

```bash
npm run launch:validate
```

## Banco e Auth

O banco principal é Supabase Postgres. As migrations ficam em `supabase/migrations`.

Regras importantes:

- Toda tabela operacional precisa respeitar `id_salao` quando pertence a um salão.
- Service Role só pode ser usada em servidor.
- Alteração de tabela deve vir com migration.
- Se mudar nome de coluna, crie camada de compatibilidade ou migração cuidadosa.
- Fluxos de login/sessão precisam ser testados no painel, App Cliente e App Profissional.
- O App Cliente usa conta global do cliente e vínculos com salões.
- O App Profissional depende de salão ativo, plano/recurso liberado e vínculo profissional.

### Blog

O blog usa Supabase separado. Não rode limpeza geral do banco principal contra o projeto do blog.

Ao migrar:

- Banco principal: dados do SaaS.
- Banco do blog: posts, views, newsletter e conteúdo editorial.

## Planos, Trial e Recursos

O motor de planos fica principalmente em:

- `lib/plans/catalog.ts`
- `lib/plans/access.ts`
- `app/api/plano/access/route.ts`
- Guardas de página, navegação e Server Actions.

Regra atual:

- Novo salão recebe **teste grátis de 15 dias**.
- Durante o teste grátis, os recursos ficam liberados.
- Ao acabar o teste, o acesso passa a respeitar plano ativo, assinatura, bloqueios e recursos.

Planos comerciais:

| Plano | Preço | Uso esperado |
| --- | ---: | --- |
| Básico | R$ 5,00/mês | Operação pequena |
| Pro | R$ 29,90/mês | Equipe em crescimento |
| Premium | R$ 59,90/mês | Operação completa |

Ao criar novo recurso:

1. Adicione ao catálogo de recursos.
2. Defina liberação por plano.
3. Proteja menu e página.
4. Proteja API/Server Action.
5. Teste com trial, plano ativo, plano bloqueado e salão inativo.

## APIs, Webhooks e Crons

Rotas API ficam em `app/api`.

Integrações críticas:

- **Asaas**: assinaturas, cobranças e webhooks.
- **Resend**: recuperação de senha, boas-vindas, newsletter/blog.
- **Supabase Cron/pg_net**: notificações e lembretes.
- **Vercel Cron**: rotinas periódicas em `vercel.json`.
- **Web Push**: notificações para App Cliente e App Profissional.

Rotas sensíveis devem validar segredo:

- `CRON_SECRET`
- `BLOG_WEBHOOK_SECRET`
- `ASAAS_WEBHOOK_TOKEN`
- segredos específicos de recuperação/sessão

Use idempotência em webhooks e notificações para evitar envio duplicado.

### Oracle VPS Auxiliar

A VPS Oracle não substitui Vercel nem Supabase. Ela funciona como braço auxiliar para monitoramento, jobs leves, webhooks internos e rotinas controladas.

Runbook completo: `docs/oracle-vps-api.md`.

Configuração no projeto principal:

```env
ORACLE_VPS_API_URL=https://api.salaopremiun.com.br
ORACLE_VPS_API_TOKEN=
```

O token da VPS fica no servidor em:

```txt
/opt/salaopremium-api/.env
```

Na VPS ele se chama `API_ADMIN_TOKEN`; na Vercel ele deve ser cadastrado como `ORACLE_VPS_API_TOKEN`. Nunca publique esse valor no GitHub.

Rotação segura do token:

1. Gerar novo token na VPS.
2. Atualizar `API_ADMIN_TOKEN` em `/opt/salaopremium-api/.env`.
3. Reiniciar o container `salaopremium-api`.
4. Atualizar `ORACLE_VPS_API_TOKEN` na Vercel.
5. Fazer redeploy.
6. Testar `/api/admin-master/oracle-vps/status` e `/api/admin-master/oracle-vps/ping`.

Segurança atual recomendada:

- Portainer apenas via túnel SSH.
- Nginx Proxy Manager admin apenas via túnel SSH.
- Público somente `22`, `80` e `443`.
- Fail2ban ativo para SSH.
- Backup diário local de `/opt/salaopremium-api` com retenção curta.

Fluxos que podem ir para a VPS, mantendo Supabase como banco/Auth:

- Monitoramento e logs pesados.
- Jobs de notificações e reprocessamento.
- Relatórios pesados e pré-cálculos.
- Webhooks externos, como Asaas, Resend e Meta.
- Backup metadata-only e, no futuro, backup compactado com retenção.
- Cálculos financeiros, comissões, caixa e conciliação quando estiverem estáveis.

Fluxos que continuam no projeto principal:

- UI do site, painel, apps e Admin Master.
- Supabase Auth e sessão SSR.
- Storage principal.
- Server Actions que precisam responder imediatamente à UI.
- Blog público no Supabase separado.

Validação da integração:

```bash
curl https://api.salaopremiun.com.br/health
curl https://api.salaopremiun.com.br/ready
```

Pelo Admin Master, valide:

- status da VPS;
- ping;
- jobs;
- monitoramento;
- alertas de disco, memória, uptime e erros recentes.

## DNS e Proteção

### Registro.br / DNS

Recomendado:

- Usar Vercel para frontend.
- Configurar `A`/`CNAME` conforme o provedor.
- Manter todos os subdomínios oficiais apontando para o deploy correto.
- Validar domínio no Resend com DNS do domínio raiz.

Checklist de DNS:

- `salaopremiun.com.br`
- `www`
- `painel`
- `login`
- `cadastro`
- `assinatura`
- `app`
- `blog`
- registros SPF/DKIM/DMARC do Resend
- `api` apontando para a Oracle VPS quando a API auxiliar estiver ativa

### Proteção

O projeto já aplica headers de segurança no Next/Vercel. Ao usar Cloudflare ou outro WAF:

- Ative HTTPS sempre.
- Use HSTS.
- Proteja login, cadastro, recuperação de senha e webhooks.
- Evite bloquear webhooks do Asaas, Supabase, Resend ou Meta.
- Configure rate limit em login, recuperação de senha e APIs públicas.
- Use modo de desafio com cuidado para não quebrar App Cliente/App Profissional.

### Verificação Google OAuth

Para a verificação do Google, mantenha públicos e coerentes:

- Página inicial com nome do app, descrição clara e links para política/termos.
- Política de privacidade em `https://salaopremiun.com.br/politica-de-privacidade`.
- Termos de uso em `https://salaopremiun.com.br/termos-de-uso`.
- Funcionalidade real do app demonstrável com conta teste.
- Escopos mínimos do Google, principalmente Calendar quando a função é sincronizar agenda.
- Marca sem uso indevido de logos Google.
- Endpoint seguro para Cross-Account Protection/RISC quando aplicável.

Não coloque páginas de app privado no sitemap público. Use `noindex` para áreas internas.

## Migração para Outro Supabase

Fluxo seguro:

1. Congelar deploy ou colocar janela de manutenção.
2. Rodar backup:

```bash
npm run backup:all:safe
```

3. Criar novo projeto Supabase com versão de Postgres compatível.
4. Aplicar migrations de `supabase/migrations`.
5. Recriar buckets do Storage e policies.
6. Migrar dados.
7. Definir estratégia para Auth:
   - manter Supabase Auth e migrar usuários quando possível;
   - ou obrigar redefinição de senha se hash/senha não puder ser migrado com segurança.
8. Atualizar variáveis:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
9. Rodar auditorias:

```bash
npm run db:audit
npm run audit:database-contract
npm run typecheck
npm run build
```

10. Testar cadastro, login, agenda, caixa, App Cliente, App Profissional e Admin Master.

## Migração para Postgres Próprio ou VPS

Migrar só o banco para Postgres próprio exige substituir partes que hoje são Supabase:

- Supabase Auth
- Supabase Storage
- RLS/policies
- RPCs/functions
- Realtime, se usado
- Edge/Cron/pg_net, se usado

Caminho recomendado:

1. Primeiro migrar frontend para VPS mantendo Supabase.
2. Depois migrar banco por partes.
3. Só remover Supabase Auth quando houver outro Auth pronto e testado.

Se for usar Postgres puro:

- Crie camada de Auth alternativa.
- Reescreva clientes Supabase em `lib/supabase/*`.
- Revise todos os Server Actions e APIs que usam Service Role.
- Recrie storage de imagens/arquivos.
- Refaça policies de segurança no novo modelo.

## Deploy em VPS

Vercel é o deploy principal. Para VPS, use Node.js compatível com a versão do Next instalada.

Fluxo base:

```bash
npm ci
npm run build
npm run start
```

Na VPS, configure:

- Node.js LTS compatível.
- Variáveis de ambiente de produção.
- Reverse proxy com Nginx ou Caddy.
- HTTPS automático.
- Logs persistentes.
- Processo com PM2, systemd ou Docker.
- Crons substituindo `vercel.json`, quando necessário.
- Limites de upload e timeout compatíveis com rotas do sistema.

Exemplo de responsabilidades do proxy:

- `salaopremiun.com.br` -> Next.js
- `painel.salaopremiun.com.br` -> Next.js
- `login.salaopremiun.com.br` -> Next.js
- `app.salaopremiun.com.br` -> Next.js
- TLS e redirecionamento HTTP para HTTPS

## Atualização Segura

Antes de mexer:

1. Verifique branch e status do Git.
2. Faça backup se tocar banco ou Auth.
3. Entenda a regra de negócio antes de editar.
4. Leia a documentação local do Next se alterar rotas, layouts, Server Components, proxy ou APIs.

Durante a alteração:

1. Faça mudanças pequenas e testáveis.
2. Proteja Client Components contra session drop.
3. Não use Service Role no navegador.
4. Não quebre isolamento por `id_salao`.
5. Não misture banco do blog com banco principal.

Antes de publicar:

```bash
npm run lint
npm run typecheck
npm run build
```

Smoke test mínimo:

- Cadastro de salão.
- Login do painel.
- Dashboard.
- Agenda.
- Caixa.
- Perfil do salão.
- Assinatura/planos.
- App Cliente login, explorar salão, reservar, agenda, perfil e notificações.
- App Profissional login, agenda, comanda e perfil.
- Admin Master dashboard, saúde, logs, salões, assinaturas, planos e recursos.

## Checklist de Publicação

Use este checklist antes de dizer que está pronto para produção:

- [ ] `npm run lint` passou.
- [ ] `npm run typecheck` passou.
- [ ] `npm run build` passou.
- [ ] Banco principal está com migrations aplicadas.
- [ ] Blog continua apontando para o projeto Supabase correto.
- [ ] Login não derruba sessão ao trocar de página.
- [ ] Login com sessão ativa redireciona para o painel/app correto.
- [ ] Trial de 15 dias libera recursos esperados.
- [ ] Bloqueio por plano funciona em UI e API.
- [ ] Agenda cria, edita, cancela e remarca.
- [ ] Caixa abre comanda, lança itens, recebe e finaliza.
- [ ] App Cliente reserva, cancela/reagenda e avalia.
- [ ] App Profissional vê agenda e comandas.
- [ ] Notificações não duplicam.
- [ ] Admin Master mostra logs, alertas e ações reais.
- [ ] Webhooks têm segredo e idempotência.
- [ ] DNS e certificados estão válidos.
- [ ] Resend está validado com SPF/DKIM/DMARC.
- [ ] Sitemap não inclui rotas privadas nem rotas de teste.
- [ ] Cadastro oficial aparece como `https://cadastro.salaopremiun.com.br/cadastro-salao`.
- [ ] Google Calendar/login Google foram testados com conta conectada e desconectada.
- [ ] API Oracle VPS responde `/health`, `/ready` e aparece saudável no Admin Master.

## Runbook de Incidentes

Quando algo falhar em produção:

1. Abra Admin Master:
   - Saúde operacional
   - Logs
   - Alertas
   - Webhooks
   - Tickets
2. Identifique:
   - rota afetada;
   - salão afetado;
   - usuário afetado;
   - horário;
   - digest/erro;
   - severidade.
3. Verifique logs da Vercel ou VPS.
4. Confira se houve deploy recente.
5. Rode auditorias locais se o erro parecer estrutural.
6. Corrija com migration se for contrato de banco.
7. Registre o motivo em auditoria/Admin Master quando houver ação manual.

Erros de sessão:

- Verificar cookies por domínio.
- Verificar redirects em `proxy.ts`.
- Verificar Supabase SSR client.
- Verificar se login/logout não remove sessão de outros dispositivos sem necessidade.

Erros de plano/recurso:

- Verificar assinatura/trial do salão.
- Verificar catálogo de planos.
- Verificar bloqueio em UI e API.
- Verificar se App Cliente/App Profissional usam a mesma regra.

Erros de geolocalização:

- Verificar endereço do salão.
- Verificar latitude/longitude salvas.
- Verificar fallback por cidade/bairro.
- Não depender do dono do salão configurar coordenadas manualmente.

## Admin Master

O Admin Master deve resolver problemas reais dos salões, não apenas listar páginas.

Funções esperadas:

- Diagnosticar erros por rota, salão e usuário.
- Ver saúde das últimas 24 horas.
- Ver lentidão, estabilidade e falhas.
- Gerenciar salões ativos/excluídos.
- Gerenciar assinaturas, cobranças e planos.
- Editar recursos por plano.
- Ver logs e alertas.
- Atender tickets.
- Controlar campanhas, notificações e WhatsApp.
- Auditar ações administrativas.

Regra de produto: se um botão não executa uma ação real, ele deve ser implementado ou removido.

## Painel do Salão

Fluxos críticos:

- Agenda: criar, editar, bloquear, remarcar, atender, cancelar.
- Caixa: comandas, itens, pagamentos, créditos, fechamento.
- Clientes: cadastro local, vínculo com App Cliente, convite e status digital.
- Profissionais: acesso ao App Profissional e permissões.
- Serviços/produtos/estoque: respeitar plano e limites.
- Assinatura: mostrar plano, trial, bloqueios e comparação.
- Perfil do salão: vitrine, link público, QR Code, pausa no App Cliente e localização.

## App Cliente

Experiência esperada:

- Leve, sem sessão caindo.
- Explorar salões por busca, localização e filtros.
- Página do salão com serviços, avaliações, portfólio e detalhes.
- Agendamento em fluxo guiado.
- Cancelar, reagendar, reservar novamente e avaliar.
- Perfil com detalhes da conta, notificações, pagamentos/recibos e avaliações.
- Notificações apontando para a tela correta.
- Salões pausados não aparecem na vitrine, mas links diretos mostram aviso sem permitir agendar.

## App Profissional

Experiência esperada:

- Login estável em mais de um dispositivo.
- Acesso liberado por trial/plano/recurso.
- Agenda clara.
- Comandas e clientes relacionados ao profissional.
- Avaliações recebidas.
- Perfil e notificações.

## Backups

Antes de qualquer limpeza, migração ou alteração grande:

```bash
npm run backup:all:safe
```

Guarde backups fora da pasta do projeto quando for operação de produção.

Nunca rode limpeza total sem confirmar:

- projeto Supabase correto;
- banco principal, não blog;
- backup recente;
- variáveis apontando para o ambiente certo.

## Convenções de Segurança

- Nunca expor Service Role no browser.
- Nunca logar senha, token, chave API ou segredo.
- Usar mensagens em PT-BR para usuário final.
- Evitar `alert()` visualmente pobre em áreas premium.
- Proteger rotas internas com segredo.
- Usar auditoria em ações críticas.
- Validar plano/recurso no servidor, não só no menu.
- Preservar isolamento por salão.

## Quando Criar Migration

Crie migration quando:

- adicionar tabela;
- adicionar coluna usada em produção;
- alterar tipo de coluna;
- criar índice;
- criar função/RPC;
- mudar política/RLS;
- adicionar trigger;
- adicionar enum;
- alterar contrato usado por API.

Depois rode:

```bash
npm run audit:database-contract
npm run typecheck
npm run build
```

## Índices e Performance

Pontos sensíveis:

- `id_salao`
- `cliente_id`
- `profissional_id`
- `data_inicio`/datas de agenda
- telefone normalizado de clientes
- status de notificações/jobs
- cobranças por status e vencimento
- logs por severidade/data/rota

Para 1000+ salões, evite varrer tabelas inteiras. Use índices, filtros por salão, paginação e jobs assíncronos.

## Padrão de UI

Direção visual:

- PT-BR claro e humano.
- Nada com texto quebrado ou acento corrompido.
- Botões com ação real.
- Loading/skeleton quando demorar.
- Estados vazios úteis.
- Responsivo em celular, tablet e desktop.
- App Cliente com experiência simples, limpa e rápida.
- Painel do salão denso, prático e profissional.
- Admin Master com foco em diagnóstico e ação.

## Glossário

| Termo | Significado |
| --- | --- |
| `id_salao` | Identificador do tenant/salão |
| Trial | Teste grátis de 15 dias com recursos liberados |
| App Cliente | Aplicativo web usado pelos clientes finais |
| App Profissional | Aplicativo web usado por profissionais |
| Admin Master | Área interna para gestão e diagnóstico do SaaS |
| Vitrine | Página pública/listagem do salão no App Cliente |
| Comanda | Atendimento/venda aberta no caixa |
| Recurso | Permissão funcional controlada por plano |

## Regra Final

Antes de publicar qualquer mudança, confirme que ela funciona nos três mundos:

1. **Painel do Salão**
2. **App Cliente**
3. **App Profissional**
4. **Admin Master**, quando a mudança afetar diagnóstico, planos, cobrança, logs ou suporte.

O sistema só está pronto quando a ação funciona na UI, no servidor, no banco e nos logs.
