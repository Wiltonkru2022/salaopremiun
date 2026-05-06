export type ServicoProcessarResponse = {
  ok: boolean;
  idServico?: string | null;
  categoria?: CategoriaServico | null;
  ativo?: boolean | null;
  status?: string | null;
};

export type ServicoProcessarErrorResponse = {
  error?: string;
};

export type AcaoServico = "salvar" | "alterar_status" | "excluir";

export type ProfissionalServico = {
  id: string;
  nome: string;
};

export type CategoriaServico = {
  id: string;
  nome: string;
};

export type ProdutoServico = {
  id: string;
  nome: string;
  unidade_medida?: string | null;
};

export type RecursoServico = {
  id: string;
  nome: string;
};

export type VinculoProfissionalServico = {
  id_profissional: string;
  ativo: boolean;
  duracao_minutos: string;
  preco_personalizado: string;
  comissao_percentual: string;
  comissao_assistente_percentual: string;
  base_calculo: string;
  desconta_taxa_maquininha: boolean | null;
};

export type ProdutoConsumoServico = {
  id_produto: string;
  quantidade_consumo: string;
  unidade_medida: string;
  custo_estimado: string;
  ativo: boolean;
};

export type VinculoServicoRow = {
  id_profissional: string;
  ativo?: boolean | null;
  duracao_minutos?: number | string | null;
  preco_personalizado?: number | string | null;
  comissao_percentual?: number | string | null;
  comissao_assistente_percentual?: number | string | null;
  base_calculo?: string | null;
  desconta_taxa_maquininha?: boolean | null;
};

export type ProdutoConsumoRow = {
  id_produto: string;
  quantidade_consumo?: number | string | null;
  unidade_medida?: string | null;
  custo_estimado?: number | string | null;
  ativo?: boolean | null;
};

export type ServicoState = {
  id?: string;
  id_salao: string;
  nome: string;
  categoria: string;
  id_categoria: string;
  descricao: string;
  gatilho_retorno_dias: string;
  duracao_minutos: string;
  pausa_minutos: string;
  recurso_nome: string;
  preco_padrao: string;
  preco_variavel: boolean;
  preco_minimo: string;
  custo_produto: string;
  comissao_percentual_padrao: string;
  comissao_assistente_percentual: string;
  base_calculo: string;
  desconta_taxa_maquininha: boolean;
  exige_avaliacao: boolean;
  app_cliente_visivel: boolean;
  status: string;
  ativo: boolean;
  eh_combo?: boolean;
  combo_resumo?: string;
};

export type ComboServicoItemState = {
  id_servico_item: string;
  ordem: number;
  preco_base: number;
  percentual_rateio: number;
};

export type ServicoProcessarPayload = {
  id_salao: string;
  nome: string;
  id_categoria: string | null;
  categoria: string | null;
  descricao: string | null;
  gatilho_retorno_dias: number | null;
  duracao_minutos: number;
  pausa_minutos: number;
  recurso_nome: string | null;
  preco_padrao: number;
  preco_variavel: boolean;
  preco_minimo: number | null;
  custo_produto: number;
  comissao_percentual_padrao: number | null;
  comissao_assistente_percentual: number;
  base_calculo: string;
  desconta_taxa_maquininha: boolean;
  exige_avaliacao: boolean;
  app_cliente_visivel: boolean;
  status: string;
  ativo: boolean;
  eh_combo?: boolean;
  combo_resumo?: string | null;
};

export type VinculoPayload = {
  id_profissional?: string | null;
  ativo?: boolean | null;
  duracao_minutos?: number | null;
  preco_personalizado?: number | null;
  comissao_percentual?: number | null;
  comissao_assistente_percentual?: number | null;
  base_calculo?: string | null;
  desconta_taxa_maquininha?: boolean | null;
};

export type ConsumoPayload = {
  id_produto?: string | null;
  quantidade_consumo?: number | null;
  unidade_medida?: string | null;
  custo_estimado?: number | null;
  ativo?: boolean | null;
};

export type ServicoProcessarBody = {
  idSalao?: string | null;
  acao?: AcaoServico | null;
  servico?: (ServicoProcessarPayload & { id?: string | null }) | null;
  novaCategoria?: string | null;
  vinculos?: VinculoPayload[] | null;
  consumos?: ConsumoPayload[] | null;
  combo_itens?: ComboServicoItemState[] | null;
};
