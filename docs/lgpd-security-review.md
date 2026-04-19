# Revisao LGPD e Seguranca

## Dados sensiveis tratados

- Nome do responsavel.
- E-mail.
- WhatsApp/telefone.
- CPF/CNPJ.
- Endereco.
- Dados operacionais do salao.
- Dados financeiros de cobrancas.
- Dados de profissionais e clientes do salao.

## Regras obrigatorias

- Senhas nunca podem ser salvas em texto puro.
- Tokens Asaas, Supabase, OpenAI e cron nunca podem ir para logs.
- Payloads de webhook devem ser mantidos somente enquanto forem uteis para auditoria.
- Logs devem priorizar referencia tecnica, nao dado pessoal completo.
- Qualquer uso de `service_role` precisa validar usuario, permissao e `id_salao` antes da operacao.
- Suporte com IA deve receber contexto minimo necessario.

## Pontos para auditoria manual

- Revisar [components/clientes/ClienteForm.tsx](../components/clientes/ClienteForm.tsx) onde ha mencao a hash de senha futura.
- Revisar rotas de usuario em `app/api/usuarios`.
- Revisar rotas financeiras em `app/api/assinatura`, `app/api/caixa`, `app/api/comandas` e `app/api/vendas`.
- Revisar payloads persistidos em `alertas_sistema`, `eventos_webhook`, `asaas_webhook_eventos` e `logs_sistema`.
- Revisar prompt/contexto de `app/api/app-profissional/suporte`.

## Criterio de aceite

- `npm run audit:service-role` passa.
- Fluxo multi-tenant bloqueia acesso cruzado.
- Logs nao contem segredo ou senha.
- Webhook sem token retorna `401` JSON e nunca redireciona.
- Admin Master mostra acao recomendada para falhas de pagamento, webhook e cron.
