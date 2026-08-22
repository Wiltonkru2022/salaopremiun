# Checklists de Produção

Use junto com `npm run release:validate`. Um release não deve seguir com item crítico pendente.

## Geral

- [ ] `npm run ci:validate` passou;
- [ ] smoke do ambiente alvo passou;
- [ ] `.env.example` está refletido no provedor;
- [ ] domínio canônico configurado;
- [ ] Asaas no ambiente correto;
- [ ] webhooks/cron com segredos corretos;
- [ ] headers de segurança conferidos;
- [ ] Admin Master acessível.

## Arquitetura das apps

- [ ] App Cliente = Next.js `app/app-cliente`;
- [ ] App Profissional = Vite `apps/app-profissional-vite`;
- [ ] não existe `app/app-profissional` concorrente;
- [ ] build gerou `public/app-profissional`;
- [ ] proxy entrega o Vite no host `app`;
- [ ] Painel/Admin Master continuam no Next.js.

## Migrations

- [ ] sequência aplicada;
- [ ] staging/produção alinhados;
- [ ] `npm run audit:database-contract` passa;
- [ ] healthcheck de RPCs passa;
- [ ] RLS revisada;
- [ ] migration histórica não foi apagada;
- [ ] alteração destrutiva tem backup.

## Agenda → Comanda → Caixa → Venda

- [ ] agendamento sincroniza pelo fluxo oficial;
- [ ] alteração de agenda não corrompe comanda;
- [ ] pagamento/fechamento idempotentes;
- [ ] cancelamento/reabertura auditados;
- [ ] estoque aplica uma vez;
- [ ] comissão usa a base oficial;
- [ ] status aparece igual no Painel, App Cliente e Vite profissional.

## Assinatura e webhook

- [ ] trial não duplica;
- [ ] cobrança pendente é reutilizada quando permitido;
- [ ] webhook deduplica antes de efeitos;
- [ ] falha vira alerta acionável;
- [ ] cron não duplica webhook;
- [ ] salão/assinatura/cobrança ficam coerentes.

## App Cliente

- [ ] cadastro/login/recuperação;
- [ ] perfil do salão com dados reais;
- [ ] disponibilidade;
- [ ] reserva;
- [ ] agendamentos;
- [ ] favoritos/avaliações;
- [ ] push/PWA.

## App Profissional Vite

- [ ] sessão/cookie seguro;
- [ ] profissional vê somente escopo autorizado;
- [ ] agenda;
- [ ] clientes/serviços;
- [ ] comandas;
- [ ] comissão;
- [ ] avaliações/notificações;
- [ ] PWA/offline;
- [ ] push;
- [ ] logout;
- [ ] Service Role ausente do bundle.

## UX

- [ ] estados têm nomes consistentes entre superfícies;
- [ ] erro mostra ação humana;
- [ ] financeiro mostra base/taxa/líquido quando relevante;
- [ ] bloqueio de plano/permissão explica motivo;
- [ ] cabeçalhos/barras fixas não escondem conteúdo;
- [ ] versão mobile testada em aparelho real.

## Admin Master

- [ ] botões possuem ação real;
- [ ] endpoints possuem guard;
- [ ] ações críticas geram log;
- [ ] saúde verifica banco/APIs/webhook/cron/deployment;
- [ ] dados sensíveis não vazam na UI.

## Pós-release

- [ ] Vercel `READY`;
- [ ] PWA profissional atualiza sem cache antigo;
- [ ] probes frescos;
- [ ] sem regressão de webhook/cron;
- [ ] smoke das apps concluído.