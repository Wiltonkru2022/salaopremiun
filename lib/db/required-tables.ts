export const REQUIRED_DATABASE_TABLES = [
  "usuarios",
  "saloes",
  "assinaturas",
  "agendamentos",
  "comandas",
  "comanda_itens",
  "comanda_pagamentos",
  "caixa_sessoes",
  "caixa_movimentacoes",
  "produtos",
  "produtos_movimentacoes",
  "tickets",
  "alertas_sistema",
  "asaas_webhook_eventos",
  "eventos_cron",
] as const;

export type RequiredDatabaseTable = (typeof REQUIRED_DATABASE_TABLES)[number];
