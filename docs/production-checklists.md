# Checklists De Producao

Use este arquivo junto com `npm run release:validate`. Release nao deve seguir se algum item critico estiver pendente.

## Checklist Geral

- `npm run ci:validate` passou.
- `npm run release:smoke` passou no ambiente alvo.
- Variaveis obrigatorias de `.env.example` existem no provedor.
- `NEXT_PUBLIC_APP_URL` aponta para o dominio canonico.
- `ASAAS_BASE_URL` esta correto para sandbox ou producao.
- `ASAAS_WEBHOOK_TOKEN` bate com o painel Asaas.
- `CRON_SECRET`, `PASSWORD_REUSE_SECRET` e `PROFISSIONAL_SESSION_SECRET` foram definidos.
- Headers de seguranca foram conferidos em producao.
- AdminMaster consegue abrir saude, alertas, webhooks, saloes, tickets e financeiro.

## Checklist De Migrations Obrigatorias

- Migrations aplicadas na ordem dos nomes em `supabase/migrations`.
- Ambiente local, staging e producao estao na mesma versao.
- `npm run audit:database-contract` passou.
- `GET /api/admin-master/saude/rpcs` passou no ambiente alvo.
- Nenhuma funcao antiga conflitante ficou ativa com nome usado pelo codigo.
- Toda tabela multi-tenant tem `id_salao` quando o dominio exige isolamento.
- RLS revisado para usuarios, clientes, profissionais, servicos, produtos, agendamentos, comandas, assinaturas, logs e tickets.

## Checklist Agenda-Comanda-Caixa-Venda

- Agendamento cria ou sincroniza comanda pelo caminho oficial.
- Alteracao de horario/profissional/status nao quebra comanda vinculada.
- Caixa exige sessao aberta quando a regra comercial exigir.
- Pagamento e fechamento sao idempotentes.
- Cancelamento tem log e reverte efeitos quando aplicavel.
- Estoque baixa somente uma vez por comanda fechada.
- Comissao usa a mesma base exibida ao gestor.

## Checklist Assinatura E Webhook

- Trial nao inicia duplicado.
- Cobranca pendente e reutilizada quando aplicavel.
- Webhook registra fingerprint/evento antes dos efeitos comerciais.
- Webhook falho vira alerta acionavel para AdminMaster.
- Cron nao duplica acao comercial que o webhook ainda pode concluir.
- Status do salao, assinatura e cobranca ficam coerentes apos Pix, boleto e cartao.

## Checklist App Profissional

- Cookie de profissional tem segredo forte, expiracao e escopo correto.
- Profissional ve somente dados do proprio salao e escopo permitido.
- Faturamento bate com comissoes fechadas do periodo.
- Tickets aparecem tambem no suporte/AdminMaster.
- Suporte IA tem limite de contexto, politica de seguranca e fallback humano.

## Checklist UX Operacional

- Nenhuma tela critica usa `window.confirm`.
- Estados pendente, confirmado, atendido, aguardando pagamento, fechado e cancelado sao consistentes entre modulos.
- Erros de API aparecem com mensagem humana e acao recomendada.
- Cards financeiros mostram bruto, liquido, taxa, repasse e comissao quando relevante.
- Itens bloqueados por plano/permissao explicam o motivo.

## Checklist AdminMaster

- Cada botao tem endpoint real ou esta oculto.
- Cada endpoint tem guard de AdminMaster.
- Acoes de salao, plano, financeiro e usuario admin geram log.
- Impersonacao, quando existir, exige auditoria forte.
- Saude verifica RPCs, migrations, webhooks, cron, assinatura, dominio e logs recentes.
