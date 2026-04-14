export type ClienteJoin = {
  nome?: string | null;
};

export type ProfissionalJoin = {
  nome?: string | null;
};

export type ComandaFila = {
  id: string;
  numero: number;
  status: string;
  aberta_em?: string | null;
  subtotal?: number | null;
  desconto?: number | null;
  acrescimo?: number | null;
  total?: number | null;
  id_cliente?: string | null;
  clientes?: ClienteJoin | ClienteJoin[] | null;
};

export type AgendamentoFila = {
  id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status: string;
  id_comanda?: string | null;
  cliente_id?: string | null;
  profissional_id?: string | null;
  servico_id?: string | null;
  clientes?: ClienteJoin | ClienteJoin[] | null;
  profissionais?: ProfissionalJoin | ProfissionalJoin[] | null;
  servicos?:
    | { nome?: string | null; preco?: number | null }
    | { nome?: string | null; preco?: number | null }[]
    | null;
};

export type ComandaDetalhe = {
  id: string;
  numero: number;
  status: string;
  subtotal: number;
  desconto: number;
  acrescimo: number;
  total: number;
  observacoes?: string | null;
  aberta_em?: string | null;
  fechada_em?: string | null;
  cancelada_em?: string | null;
  id_cliente?: string | null;
  clientes?: ClienteJoin | ClienteJoin[] | null;
};

export type TipoItemComanda = "servico" | "produto" | "extra" | "ajuste";

export type ComandaItem = {
  id: string;
  id_comanda: string;
  tipo_item: TipoItemComanda;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  custo_total?: number | null;

  id_servico?: string | null;
  id_produto?: string | null;
  id_extra?: string | null;

  id_profissional?: string | null;
  id_assistente?: string | null;

  comissao_percentual_aplicada?: number | null;
  comissao_valor_aplicado?: number | null;
  comissao_assistente_percentual_aplicada?: number | null;
  comissao_assistente_valor_aplicado?: number | null;
  base_calculo_aplicada?: string | null;
  desconta_taxa_maquininha_aplicada?: boolean | null;

  origem?: string | null;
  observacoes?: string | null;
  ativo?: boolean | null;

  created_at?: string | null;
  updated_at?: string | null;

  profissionais?: ProfissionalJoin | ProfissionalJoin[] | null;
  assistente_ref?: ProfissionalJoin | ProfissionalJoin[] | null;
};

export type ComandaPagamento = {
  id: string;
  id_comanda: string;
  forma_pagamento: string;
  valor: number;
  parcelas: number;

  taxa_maquininha_percentual?: number | null;
  taxa_maquininha_valor?: number | null;

  observacoes?: string | null;
  recebido_em?: string | null;
  created_at?: string | null;
};

export type AbaCaixa = "fila" | "fechadas" | "canceladas";

export type ConfigCaixaSalao = {
  id_salao?: string;
  exigir_cliente_na_venda?: boolean | null;
  repassa_taxa_cliente?: boolean | null;

  taxa_maquininha_credito?: number | null;
  taxa_maquininha_debito?: number | null;
  taxa_maquininha_pix?: number | null;
  taxa_maquininha_transferencia?: number | null;
  taxa_maquininha_boleto?: number | null;
  taxa_maquininha_outro?: number | null;

  taxa_credito_1x?: number | null;
  taxa_credito_2x?: number | null;
  taxa_credito_3x?: number | null;
  taxa_credito_4x?: number | null;
  taxa_credito_5x?: number | null;
  taxa_credito_6x?: number | null;
  taxa_credito_7x?: number | null;
  taxa_credito_8x?: number | null;
  taxa_credito_9x?: number | null;
  taxa_credito_10x?: number | null;
  taxa_credito_11x?: number | null;
  taxa_credito_12x?: number | null;
};

export type ProfissionalResumo = {
  id: string;
  nome: string;
  comissao_percentual?: number | null;
  comissao?: number | null;
};

export type CatalogoServico = {
  id: string;
  nome: string;
  preco?: number | null;
  preco_padrao?: number | null;

  comissao_percentual?: number | null;
  comissao_percentual_padrao?: number | null;
  comissao_assistente_percentual?: number | null;

  base_calculo?: string | null;
  desconta_taxa_maquininha?: boolean | null;
};

export type CatalogoProduto = {
  id: string;
  nome: string;
  preco?: number | null;
  preco_venda?: number | null;
  valor?: number | null;
};

export type CatalogoExtra = {
  id: string;
  nome: string;
  preco?: number | null;
  valor?: number | null;
  preco_padrao?: number | null;
  preco_venda?: number | null;
  valor_padrao?: number | null;
};
