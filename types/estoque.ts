export type AcaoEstoque = "movimentacao_manual";

export type EstoqueMovimentacaoPayload = {
  idProduto?: string | null;
  tipo?: string | null;
  origem?: string | null;
  quantidade?: number | null;
  valorUnitario?: number | null;
  observacoes?: string | null;
};

export type EstoqueProcessarBody = {
  idSalao?: string | null;
  acao?: AcaoEstoque | null;
  movimentacao?: EstoqueMovimentacaoPayload | null;
};

export type EstoqueProcessarResponse = {
  ok: boolean;
  idMovimentacao?: string | null;
  estoqueAtual?: number | null;
};

export type EstoqueProcessarErrorResponse = {
  error?: string;
};
