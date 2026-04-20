export type ProcessarComandaAcao =
  | "salvar_base"
  | "adicionar_item"
  | "editar_item"
  | "remover_item"
  | "enviar_pagamento"
  | "criar_por_agendamento";

export type ProcessarComandaResponse = {
  ok: boolean;
  idComanda?: string;
  idItem?: string;
  status?: string;
  jaExistia?: boolean;
};

export type ProcessarComandaErrorResponse = {
  error?: string;
};

export type ProcessarComandaItemPayload = {
  idItem?: string | null;
  tipo_item?: string;
  id_agendamento?: string;
  id_servico?: string | null;
  id_produto?: string | null;
  descricao?: string | null;
  quantidade?: number;
  valor_unitario?: number;
  custo_total?: number;
  id_profissional?: string | null;
  id_assistente?: string | null;
  origem?: string | null;
};

export type ProcessarComandaParams = {
  acao: ProcessarComandaAcao;
  item?: ProcessarComandaItemPayload;
  desconto?: number;
  acrescimo?: number;
  status?: string;
};

export type ProcessarCaixaAcao =
  | "abrir_caixa"
  | "fechar_caixa"
  | "lancar_movimentacao"
  | "adicionar_pagamento"
  | "remover_pagamento"
  | "finalizar_comanda"
  | "cancelar_comanda";

export type ProcessarCaixaResponse = {
  ok: boolean;
  warning?: string | null;
  taxaPercentual?: number;
  taxaValor?: number;
  valorFinalCobrado?: number;
  repassaTaxaCliente?: boolean;
  idempotentReplay?: boolean;
};

export type ProcessarCaixaErrorResponse = {
  error?: string;
};

export type ProcessarCaixaSessaoPayload = {
  idSessao?: string;
  valorAbertura?: number;
  valorFechamento?: number;
  observacoes?: string;
};

export type ProcessarCaixaMovimentoPayload = {
  tipo?: string;
  valor?: number;
  descricao?: string;
  idProfissional?: string | null;
};

export type ProcessarCaixaPagamentoPayload = {
  idPagamento?: string;
  formaPagamento?: string;
  valor?: number;
  valorBase?: number;
  parcelas?: number;
  taxaPercentual?: number;
  observacao?: string | null;
  observacoes?: string | null;
};

export type ProcessarCaixaParams = {
  acao: ProcessarCaixaAcao;
  idempotencyKey?: string | null;
  sessao?: ProcessarCaixaSessaoPayload;
  movimento?: ProcessarCaixaMovimentoPayload;
  pagamento?: ProcessarCaixaPagamentoPayload;
  motivo?: string | null;
};
