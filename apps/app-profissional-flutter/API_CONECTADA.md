# Mapa de integração API — App Profissional Flutter

O cliente HTTP fica em `lib/core/api/professional_api.dart`.
O estado/sincronização fica em `lib/core/state/app_controller.dart`.
Os modelos de resposta ficam em `lib/data/api_models.dart`.

## Segurança

O app pede ao endpoint de login um token nativo usando `X-SP-Native-App`. O token nunca é colocado em código-fonte, URL ou SharedPreferences simples. Ele fica em `flutter_secure_storage` e é aplicado no header Bearer.

## Sincronização

`AppController.refreshAll()` sincroniza em paralelo:
- data
- comandas
- comissões
- avaliações
- cupons

As mutações atualizam a coleção correspondente depois da resposta da API, evitando que a UI fique mostrando dados locais antigos.

## Tratamento de sessão

HTTP 401 durante sincronização remove a sessão local. Troca de senha com `reauthenticate=true` também limpa a sessão. O `main.dart` observa o controller e volta automaticamente à tela de login.
