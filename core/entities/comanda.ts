export const COMANDA_STATUS = [
  "aberta",
  "em_atendimento",
  "aguardando_pagamento",
  "fechada",
  "cancelada",
] as const;

export type ComandaStatus = (typeof COMANDA_STATUS)[number];

export type ComandaItemTipo = "servico" | "produto" | "extra" | "ajuste";

export type ComandaItemEntity = {
  id?: string;
  tipo: ComandaItemTipo;
  descricao?: string | null;
  quantidade?: number | null;
  valor_unitario?: number | null;
  valor_total?: number | null;
  desconto?: number | null;
  acrescimo?: number | null;
};

export type ComandaEntity = {
  id?: string;
  id_salao: string;
  id_cliente?: string | null;
  id_agendamento?: string | null;
  status: ComandaStatus;
  subtotal?: number | null;
  desconto?: number | null;
  acrescimo?: number | null;
  total?: number | null;
  itens?: ComandaItemEntity[];
};

export function isComandaStatus(value: string): value is ComandaStatus {
  return COMANDA_STATUS.includes(value as ComandaStatus);
}
