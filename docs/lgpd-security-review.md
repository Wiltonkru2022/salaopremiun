# Revisão LGPD e Segurança

## Dados tratados

O produto pode tratar:

- nome;
- e-mail;
- WhatsApp/telefone;
- CPF/CNPJ;
- data de nascimento;
- endereço;
- dados de clientes/profissionais;
- agenda e histórico operacional;
- dados financeiros de cobranças/comandas;
- dados técnicos de segurança e telemetria.

A classificação e retenção devem considerar finalidade, necessidade e acesso.

## Princípios obrigatórios

- senhas nunca em texto puro;
- Service Role, tokens Asaas/Brevo/Meta/OpenAI e segredos de cron/sessão nunca no client/log;
- logs preferem IDs técnicos a PII completa;
- acesso privilegiado valida sessão, permissão e tenant;
- IA recebe contexto mínimo;
- webhooks persistem somente o necessário para operação/auditoria;
- exclusão/anonimização deve respeitar obrigações legais e relacionamentos financeiros.

## Arquitetura de segurança

### Painel

Neon Auth + `usuarios` + `id_salao` + permissões.

### App Cliente

Contexto próprio. CPF/data de nascimento são dados de identificação e exigem especial cuidado em logs, recuperação e mensagens de erro.

### App Profissional Vite

Sessão própria via APIs `/api/app-profissional/auth/*`. O bundle público nunca recebe `PROFISSIONAL_SESSION_SECRET` nem Service Role.

### Admin Master

Guard próprio e auditoria para ações globais.

## Multi-tenancy

Qualquer uso de Service Role precisa validar explicitamente o salão/recurso antes da operação. RLS não deve ser desabilitada para “resolver” erro de permissão.

## Pontos de auditoria

- `app/api/usuarios` e ações administrativas;
- rotas financeiras/assinatura/caixa/comandas/vendas;
- `/api/app-profissional/*`;
- fluxos de recuperação do App Cliente;
- `alertas_sistema`, `eventos_webhook`, `asaas_webhook_eventos`, `logs_sistema`;
- suporte com IA;
- storage e URLs públicas;
- políticas `SECURITY DEFINER`/`EXECUTE`.

## Editor removido

A antiga UI de editor de imagens, assets e endpoint Pexels foram removidos. A migration histórica do schema do editor permanece versionada; remoção física de dados/schema exige nova migration e revisão de retenção/backup.

## Critério de aceite

- `npm run audit:service-role` passa;
- `npm run audit:api-guards` passa;
- teste multi-tenant bloqueia cruzamento;
- logs não contêm segredo/senha;
- webhook inválido é rejeitado sem redirect para HTML;
- PWA profissional contém apenas configuração pública;
- Admin Master apresenta ações de incidente sem expor segredo.