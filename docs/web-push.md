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
