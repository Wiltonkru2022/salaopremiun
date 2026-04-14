export type ClienteJoin = {
  nome?: string | null;
};

export type SalaoInfo = {
  id: string;
  nome?: string | null;
  cpf_cnpj?: string | null;
  telefone?: string | null;
  endereco?: string | null;
};

export type ComandaVenda = {
  id: string;
  numero: number;
  status: string;
  subtotal?: number | null;
  desconto?: number | null;
  acrescimo?: number | null;
  total?: number | null;
  aberta_em?: string | null;
  fechada_em?: string | null;
  cancelada_em?: string | null;
  id_cliente?: string | null;
  clientes?: ClienteJoin | ClienteJoin[] | null;
};

export type VendaBuscaRow = {
  id: string;
  id_salao: string;
  numero: number;
  status: string;
  id_cliente?: string | null;
  subtotal?: number | null;
  desconto?: number | null;
  acrescimo?: number | null;
  total?: number | null;
  aberta_em?: string | null;
  fechada_em?: string | null;
  cancelada_em?: string | null;
  cliente_nome?: string | null;
  profissionais_nomes?: string | null;
  itens_descricoes?: string | null;
  formas_pagamento?: string | null;
};

export type Pagamento = {
  id: string;
  forma_pagamento: string;
  valor: number;
  parcelas?: number | null;
  observacoes?: string | null;
};

export type ItemVenda = {
  id: string;
  tipo_item: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
};

export type VendaDetalhe = {
  comanda?: ComandaVenda | null;
  itens: ItemVenda[];
  pagamentos: Pagamento[];
  agendamentos: unknown[];
  comissoes: unknown[];
};
