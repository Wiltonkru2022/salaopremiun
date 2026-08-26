# Web Push

O SalãoPremium usa Web Push/PWA para notificações de navegador/dispositivo sem depender de VPS permanente.

## Arquitetura

```text
App Cliente / App Profissional Vite
              ↓
       PushSubscription
              ↓
           Neon
              ↓
      notification_jobs
              ↓
       Vercel + web-push
              ↓
            VAPID
              ↓
   serviço push do navegador
```

## Configuração

```env
WEB_PUSH_PUBLIC_KEY=
WEB_PUSH_PRIVATE_KEY=
WEB_PUSH_SUBJECT=mailto:suporte@salaopremiun.com.br
```

Gerar chaves quando necessário:

```bash
npx web-push generate-vapid-keys
```

A chave pública pode ser entregue ao navegador. A privada fica somente no backend.

## Audiências

### Cliente

Subscription vinculada ao contexto/dispositivo do App Cliente.

### Profissional

Subscription criada pelo **Vite PWA em `apps/app-profissional-vite`** e associada ao profissional/dispositivo permitido.

Não misturar destinatário de cliente e profissional apenas por endpoint; persistir audiência/identidade suficiente para roteamento seguro.

## Fluxos esperados

- cliente cria/reserva → salão/profissional elegível recebe aviso;
- profissional confirma/altera → cliente recebe evento correspondente;
- reagendamento/cancelamento gera notificações conforme regra;
- eventos duplicados precisam de dedupe/tag quando aplicável.

## iOS

Web Push em iOS exige PWA instalado na tela inicial e permissão concedida.

## Validação

1. `/api/push/public-key` retorna chave pública quando configurado;
2. App Cliente registra subscription;
3. App Profissional Vite registra subscription;
4. `push_subscriptions` contém registro ativo correto;
5. criar agendamento real de teste;
6. profissional recebe push;
7. confirmar/alterar e validar push do cliente;
8. verificar `notification_jobs`;
9. verificar `push_delivery_log`;
10. testar PWA fechado/tela bloqueada.

## Tratamento de erros

- `404/410`: endpoint expirado, desativar subscription;
- `401/403`: manter evidência para diagnosticar VAPID/autorização;
- `429`, rede e `5xx`: retry com backoff antes da falha final;
- nunca logar chave privada ou payload pessoal completo.

## PWA e atualização

Após release do App Profissional, confirmar que o service worker Vite atualizou e que uma versão antiga em cache não impede registro/entrega de push.