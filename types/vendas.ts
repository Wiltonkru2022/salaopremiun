export type AcaoVenda = "detalhes" | "reabrir" | "excluir";

export type VendaProcessarBody = {
  idSalao?: string | null;
  acao?: AcaoVenda | null;
  idComanda?: string | null;
  motivo?: string | null;
};

export type VendaProcessarResponse<TDetalhe = unknown> = {
  ok: boolean;
  detalhe?: TDetalhe | null;
  warning?: string | null;
};

export type VendaProcessarErrorResponse = {
  error?: string;
};
