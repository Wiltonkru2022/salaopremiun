# App profissional: Google OAuth

## Objetivo
Permitir que o profissional conecte uma conta Google no perfil e, depois disso, entre pelo botao "Entrar com Google".

## Rotas do sistema
- Inicio do OAuth: `/app-profissional/auth/google/start`
- Callback do OAuth: `/app-profissional/auth/google/callback`
- URL publica de callback: `https://app.salaopremiun.com.br/app-profissional/auth/google/callback`

## Supabase Auth
No painel do Supabase:
- Acesse `Authentication > Providers > Google`.
- Ative o provider Google.
- Preencha `Client ID`.
- Preencha `Client Secret`.
- Salve.

Em `Authentication > URL Configuration`:
- Site URL recomendado: `https://app.salaopremiun.com.br`
- Redirect URL obrigatoria:
  - `https://app.salaopremiun.com.br/app-profissional/auth/google/callback`

## Google Cloud Console
No OAuth Client usado pelo Supabase:
- Tipo: Web application.
- Authorized JavaScript origins:
  - `https://app.salaopremiun.com.br`
  - `https://salaopremiun.com.br`
- Authorized redirect URIs:
  - use a URL de callback do Supabase Auth, normalmente no formato:
    - `https://<project-ref>.supabase.co/auth/v1/callback`

Importante: o Google normalmente redireciona primeiro para o callback do Supabase Auth. O Supabase entao redireciona para a rota do app definida em `redirectTo`.

## Teste operacional
1. Entre no app profissional com CPF e senha.
2. Abra `Perfil`.
3. Clique em `Conectar conta Google`.
4. Autorize no Google.
5. Confirme se voltou para `Perfil` com mensagem de conta conectada.
6. Saia da conta.
7. Entre pela tela de login usando `Entrar com Google`.

## Falhas comuns
- Se voltar para login com erro Google, confira o provider no Supabase.
- Se o Google bloquear a autorizacao, confira o redirect URI no Google Cloud.
- Se conectar, mas nao logar depois, confira se a migration `202604230001_profissional_google_oauth.sql` foi aplicada.
- Se o painel SaaS ficar logado com o usuario Google, revisar o callback profissional. Ele deve limpar a sessao Supabase depois de criar a sessao profissional.
