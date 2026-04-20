export type AcaoProduto = "salvar" | "alterar_status" | "excluir";

export type ProdutoPayload = {
  id?: string | null;
  id_salao?: string | null;
  nome?: string | null;
  sku?: string | null;
  codigo_barras?: string | null;
  marca?: string | null;
  linha?: string | null;
  unidade_medida?: string | null;
  quantidade_por_embalagem?: number | null;
  preco_custo?: number | null;
  custos_extras?: number | null;
  custo_por_dose?: number | null;
  dose_padrao?: number | null;
  unidade_dose?: string | null;
  preco_venda?: number | null;
  margem_lucro_percentual?: number | null;
  estoque_atual?: number | null;
  estoque_minimo?: number | null;
  estoque_maximo?: number | null;
  data_validade?: string | null;
  lote?: string | null;
  destinacao?: string | null;
  categoria?: string | null;
  comissao_revenda_percentual?: number | null;
  fornecedor_nome?: string | null;
  fornecedor_contato_nome?: string | null;
  fornecedor_telefone?: string | null;
  fornecedor_whatsapp?: string | null;
  prazo_medio_entrega_dias?: number | null;
  observacoes?: string | null;
  foto_url?: string | null;
  ativo?: boolean | null;
  status?: string | null;
};

export type ProdutoProcessarBody = {
  idSalao?: string | null;
  acao?: AcaoProduto | null;
  produto?: ProdutoPayload | null;
};

export type ProdutoProcessarResponse = {
  ok: boolean;
  idProduto?: string | null;
  ativo?: boolean | null;
  status?: string | null;
};

export type ProdutoProcessarErrorResponse = {
  error?: string;
};
