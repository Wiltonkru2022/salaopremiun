export type AcaoComanda =
  | "salvar_base"
  | "adicionar_item"
  | "editar_item"
  | "remover_item"
  | "enviar_pagamento"
  | "criar_por_agendamento";

export type ComandaPayload = {
  idComanda?: string | null;
  numero?: number | null;
  idCliente?: string | null;
  status?: string | null;
  observacoes?: string | null;
  desconto?: number | null;
  acrescimo?: number | null;
};

export type ItemPayload = {
  idItem?: string | null;
  tipo_item?: string | null;
  quantidade?: number | null;
  valor_unitario?: number | null;
  observacoes?: string | null;
  origem?: string | null;
  id_servico?: string | null;
  id_produto?: string | null;
  id_agendamento?: string | null;
  descricao?: string | null;
  custo_total?: number | null;
  id_profissional?: string | null;
  id_assistente?: string | null;
};

export type ProcessarComandaBody = {
  idSalao?: string | null;
  acao?: AcaoComanda | null;
  idempotencyKey?: string | null;
  comanda?: ComandaPayload | null;
  item?: ItemPayload | null;
};

export type ProcessarComandaParams = {
  acao: AcaoComanda;
  item?: ItemPayload;
  desconto?: number;
  acrescimo?: number;
  status?: string;
};

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
