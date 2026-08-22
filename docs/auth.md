# Autenticação, Sessões e Identidade

O SalãoPremium possui três contextos de autenticação diferentes. Eles não devem ser misturados.

## 1. Painel do salão

### Tecnologia

- Supabase Auth;
- sessão SSR/server-side;
- tabela `usuarios` para dados e vínculo de negócio.

A tabela `usuarios` relaciona o usuário autenticado ao salão, nível/status e permissões. O `auth_user_id` é a ponte para Supabase Auth.

### Regras

- usuário inativo não opera o painel;
- toda mutação confirma `id_salao` no servidor;
- último admin não deve ser removido sem regra específica;
- Service Role só pode ser usada após autenticação/autorização;
- permissão de UI não substitui guard server-side.

## 2. App Cliente

O App Cliente possui fluxo de identidade próprio, separado do login administrativo.

### Cadastro atual

- nome completo;
- data de nascimento;
- CPF válido;
- WhatsApp;
- e-mail opcional.

### Login atual

- CPF + data de nascimento.

### Recuperação

O fluxo pode confirmar identidade por e-mail ou por CPF + nascimento. Alteração de e-mail exige validação e confirmação por código antes de persistir o novo endereço.

### Segurança

- mensagens de recuperação não devem revelar desnecessariamente se uma conta existe;
- CPF/data de nascimento não devem aparecer em logs comuns;
- sessão precisa ser validada novamente antes de mutações;
- agendamento sempre valida contexto do cliente e disponibilidade real.

## 3. App Profissional — Vite

O único frontend profissional é `apps/app-profissional-vite`.

O Vite não deve autenticar o profissional usando a sessão administrativa do painel. Ele usa APIs próprias:

```text
POST /api/app-profissional/auth/login
GET  /api/app-profissional/auth/session
POST /api/app-profissional/auth/logout
```

A credencial de entrada atual é CPF + senha. A API valida o profissional e cria uma sessão própria assinada com segredo server-side.

### Regras

- `PROFISSIONAL_SESSION_SECRET` somente no backend;
- cookie seguro/httpOnly em produção;
- cada operação revalida `id_profissional` e `id_salao`;
- profissional bloqueado/inativo/plano inválido não recebe contexto operacional;
- publishable key do Supabase pode existir no PWA, Service Role nunca.

## 4. Admin Master

Admin Master possui guard/contexto próprio e não deve ser liberado apenas porque o usuário é `admin` de um salão.

## Fluxos separados

```text
Painel          → Supabase Auth → usuarios → id_salao
App Cliente     → contexto cliente → identidade cliente
App Profissional→ API auth própria → sessão profissional
Admin Master    → sessão/guard Admin Master
```

## Cookies e domínios

Os hosts são roteados pelo `proxy.ts`. Em produção, cookies sensíveis precisam usar configurações coerentes de domínio, `Secure`, `HttpOnly` e `SameSite` conforme o fluxo.

## OAuth Google

- Google Calendar do painel é uma integração separada da autenticação principal;
- Google OAuth para login do App Profissional está desativado;
- não reintroduzir rotas OAuth profissionais da antiga implementação Next sem um projeto aprovado.

## Checklist de alteração de auth

- [ ] fluxo correto (painel, cliente, profissional ou Admin Master) identificado;
- [ ] guard server-side presente;
- [ ] tenant/profissional validado;
- [ ] rate limit/tentativas revisados;
- [ ] erro não vaza existência/PII desnecessária;
- [ ] cookie seguro;
- [ ] logs sanitizados;
- [ ] logout invalida sessão;
- [ ] E2E relevante atualizado.