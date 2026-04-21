export const VENDA_STATUS = [
  "rascunho",
  "aberta",
  "aguardando_pagamento",
  "paga",
  "cancelada",
] as const;

export type VendaStatus = (typeof VENDA_STATUS)[number];

export type VendaItemEntity = {
  id?: string;
  tipo: "produto" | "servico" | "extra" | "ajuste";
  descricao?: string | null;
  quantidade?: number | null;
  valor_unitario?: number | null;
  valor_total?: number | null;
};

export type VendaEntity = {
  id?: string;
  id_salao: string;
  id_cliente?: string | null;
  status: VendaStatus;
  subtotal?: number | null;
  desconto?: number | null;
  acrescimo?: number | null;
  total?: number | null;
  itens?: VendaItemEntity[];
};

export function isVendaStatus(value: string): value is VendaStatus {
  return VENDA_STATUS.includes(value as VendaStatus);
}
