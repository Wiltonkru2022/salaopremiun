# Web Push

Notificacoes de barra do celular usam a API Web Push/PWA.

## Configuracao

1. Aplique a migration `push_subscriptions` no Supabase.
2. Gere chaves VAPID:

```bash
npx web-push generate-vapid-keys
```

3. Configure no ambiente server:

```bash
WEB_PUSH_PUBLIC_KEY=
WEB_PUSH_PRIVATE_KEY=
WEB_PUSH_SUBJECT=mailto:suporte@salaopremiun.com.br
```

Sem `WEB_PUSH_PUBLIC_KEY` e `WEB_PUSH_PRIVATE_KEY`, o botao de avisos fica oculto e o agendamento continua normal.

## Fluxos

- Cliente cria agendamento no app cliente: o salao e o profissional recebem push para confirmar.
- Profissional confirma no app profissional: o cliente recebe push de agendamento confirmado.
- Em iOS, notificacoes web exigem o app instalado na tela inicial e permissao concedida.

## Validacao em producao

1. Confirme que `/api/push/public-key` responde com `ok: true` e uma chave publica.
2. Abra o App Profissional no celular e ative as notificacoes; o navegador deve conceder permissao e registrar uma `PushSubscription`.
3. Confirme no Supabase que existe uma linha ativa em `push_subscriptions` para o profissional/dispositivo usado no teste.
4. Crie um agendamento pelo App Cliente para esse profissional e confirme que o profissional recebe a notificacao.
5. Confirme o agendamento no App Profissional e confirme que o cliente recebe a notificacao.
6. Teste reagendamento e cancelamento e acompanhe `notification_jobs` ate `enviada` ou `falhou`.
7. Consulte `push_delivery_log` para validar `status`, `http_status`, `endpoint_host`, `notification_tag` e eventual `error_message`.
8. Para endpoints expirados, `404` e `410` devem desativar a subscription; `401` e `403` devem permanecer ativos para diagnostico de VAPID/autenticacao.
9. `429`, falhas de rede e respostas `5xx` devem usar retry com backoff antes de registrar falha final.
10. Teste tambem com o PWA fechado e a tela do aparelho bloqueada.
