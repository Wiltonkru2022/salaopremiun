# Android APK shells

Este diretorio contem dois projetos Android Capacitor que empacotam as experiencias web oficiais:

- `profissional`: abre `https://app.salaopremiun.com.br/app-profissional/`
- `cliente`: abre `https://app.salaopremiun.com.br/app-cliente/`

Esse formato preserva UI, cores, rotas e regras de negocio do app web/Next/Vite, evitando duplicar telas dentro do APK.

## Requisitos locais

- Android Studio instalado.
- Android SDK instalado.
- Java 21. No ambiente local atual, o JDK usado e o embutido no Android Studio:
  `C:\Program Files\Android\Android Studio\jbr`

## Build debug

No PowerShell, ajuste as variaveis da sessao antes de compilar:

```powershell
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT="$env:LOCALAPPDATA\Android\Sdk"
```

Depois gere cada APK:

```powershell
npm --prefix apps/mobile-shells/profissional run apk:debug
npm --prefix apps/mobile-shells/cliente run apk:debug
```

Saidas:

- `apps/mobile-shells/profissional/android/app/build/outputs/apk/debug/app-debug.apk`
- `apps/mobile-shells/cliente/android/app/build/outputs/apk/debug/app-debug.apk`

Para publicar em loja, gere um release assinado com uma keystore de producao.

## Push nativo Android

O push nativo usa Firebase Cloud Messaging apenas como provedor de entrega:

- Profissional: `br.com.salaopremiun.profissional`
- Cliente: `br.com.salaopremiun.cliente`

Cada app Android precisa do seu proprio `google-services.json` em:

- `apps/mobile-shells/profissional/android/app/google-services.json`
- `apps/mobile-shells/cliente/android/app/google-services.json`

O servidor Next envia FCM usando Firebase Admin. Configure na Vercel uma destas
opcoes:

- `FIREBASE_SERVICE_ACCOUNT_JSON`
- ou `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY`
- se a chave privada for dificil de colar com quebras de linha, use
  `FIREBASE_PRIVATE_KEY_BASE64`

Tambem mantenha `CRON_SECRET` configurado, porque `/api/cron/notificacoes`
processa os lembretes e jobs pendentes.
