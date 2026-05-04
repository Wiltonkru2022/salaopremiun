export const OBSERVABILITY_RETENTION_DEFAULTS = {
  eventosSistemaDays: 45,
  logsSistemaDays: 30,
  acoesAutomaticasDays: 45,
  eventosWebhookDays: 30,
  eventosCronDays: 30,
  batchLimit: 500,
} as const;

export type ObservabilityCleanupRow = {
  table_name: string;
  deleted_count: number | null;
};

export function formatObservabilityCleanupSummary(
  rows: ObservabilityCleanupRow[]
) {
  const safeRows = rows.map((row) => ({
    tableName: row.table_name,
    deletedCount: Number(row.deleted_count || 0),
  }));

  const total = safeRows.reduce((sum, row) => sum + row.deletedCount, 0);

  if (!safeRows.length) {
    return {
      total: 0,
      summary: "Nenhuma tabela de observabilidade foi processada.",
      detail: [] as Array<{ tableName: string; deletedCount: number }>,
    };
  }

  const summary =
    total > 0
      ? `Limpeza concluida com ${total} registro(s) removido(s).`
      : "Limpeza concluida sem registros antigos para remover.";

  return {
    total,
    summary,
    detail: safeRows,
  };
}
