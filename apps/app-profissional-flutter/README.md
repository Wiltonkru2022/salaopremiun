# Salão Premium Profissional — Flutter + API real

Aplicativo profissional criado em **Dart + Flutter**, sem Vite, React, HTML, JavaScript, Capacitor ou WebView.

Esta versão está conectada ao backend oficial do App Profissional em:

`https://app.salaopremiun.com.br`

Identificador nativo usado pelo servidor:

`br.com.salaopremiun.profissional`

## Autenticação nativa

O login envia CPF e senha para `/api/app-profissional/auth/login` com o header:

`X-SP-Native-App: br.com.salaopremiun.profissional`

O `nativeAccessToken` devolvido pelo servidor é salvo com `flutter_secure_storage` e enviado nas próximas requisições como:

`Authorization: Bearer <token>`

Ao abrir o APK novamente, o aplicativo tenta restaurar a sessão por `/api/app-profissional/auth/session`. Sessão inválida ou troca de senha levam o usuário novamente ao login.

## Telas e dados reais

- Splash animada em Flutter
- Login por CPF/senha
- Hoje / resumo
- Agenda
- Clientes
- Serviços
- Comandas
- Cupons
- Comissão
- Avaliações
- Notificações
- Perfil
- Configurações
- Suporte / dúvidas
- Logout

Não há mais `demo_models.dart` nem listas de demonstração sendo usadas pelas telas.

## Endpoints conectados

### Sessão
- `POST /api/app-profissional/auth/login`
- `GET /api/app-profissional/auth/session`
- `POST /api/app-profissional/auth/logout`

### Dados do profissional
- `GET /api/app-profissional/data?start=...&end=...`

Carrega agenda, bloqueios, clientes, serviços, profissionais e notificações.

### Agenda
- `POST /api/app-profissional/agenda/acao`
  - confirmar
  - confirmar Pix
  - reagendar
  - cancelar/remover
- `POST /api/app-profissional/agenda/bloquear`
- `POST /api/app-profissional/agenda/auditoria-criacao`
- criação de agendamento via `/api/app-profissional/mutacoes`

### Clientes e serviços
Via `POST /api/app-profissional/mutacoes`:
- criar cliente
- editar cliente
- criar serviço
- editar serviço

### Comandas
- `GET /api/app-profissional/comandas`
- abrir comanda via `/mutacoes`
- adicionar item via `/mutacoes`
- fechar/enviar ao caixa via `/mutacoes`

### Comissão
- `GET /api/app-profissional/comissoes`

### Avaliações
- `GET /api/app-profissional/avaliacoes`
- exclusão via `/api/app-profissional/mutacoes`

### Cupons
- `GET /api/app-profissional/cupons`
- `POST /api/app-profissional/cupons`
- `PATCH /api/app-profissional/cupons`
- `DELETE /api/app-profissional/cupons`
- abertura de WhatsApp com link exclusivo devolvido pela API

### Notificações
- notificações carregadas com `/data`
- `POST /api/app-profissional/notificacoes/read`
- marcar uma ou todas como lidas
- contador real no sino e no menu

### Perfil e configurações
- dados do perfil via `/auth/session`
- `POST /api/app-profissional/configuracoes`
- troca de senha via `/api/app-profissional/mutacoes`

## Suporte

A tela de Suporte mantém as dúvidas e o fluxo visual do app de referência, mas **não simula envio de ticket**.

As rotas `/api/app-profissional/suporte`, `/suporte/finalizar` e `/tickets` existem na pasta enviada, porém elas dependem de use-cases que não vieram no ZIP e usam uma validação de sessão por cookie diferente das rotas nativas principais. Por isso o Flutter não inventa um body nem informa falsamente que um ticket foi enviado.

Para ligar também o chat/ticket real, são necessários os contratos dos use-cases importados pelas rotas, principalmente:

- `@/core/use-cases/app-profissional/processarSuporteIA`
- `@/core/use-cases/suporte/profissionalTickets`

## Android

- Package/applicationId: `br.com.salaopremiun.profissional`
- Permissão `android.permission.INTERNET` configurada
- Token armazenado de forma segura
- Requisições HTTPS
- Timeout e mensagens para falha de conexão

## Dependências adicionadas

- `http`
- `flutter_secure_storage`
- `url_launcher`

## Rodar o projeto

```bash
flutter pub get
flutter run
```

## Gerar APK

```bash
flutter build apk --release
```

O ambiente usado para montar esta entrega não possui o SDK Flutter/Dart instalado. Portanto foram feitas verificações estruturais dos arquivos, imports, delimitadores, rotas e AndroidManifest, mas a compilação final do APK precisa ser executada em uma máquina com Flutter instalado.
