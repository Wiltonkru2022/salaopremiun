export type TotalRow = {
  total?: number | string | null;
};

export type StatusRow = {
  status?: string | null;
};

export type ComandaContexto = {
  id: string;
  numero?: number | string | null;
  status?: string | null;
  subtotal?: number | string | null;
  desconto?: number | string | null;
  acrescimo?: number | string | null;
  total?: number | string | null;
  id_cliente?: string | null;
};

export type AgendamentoContexto = {
  id: string;
  data?: string | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  status?: string | null;
  cliente_id?: string | null;
  servico_id?: string | null;
  id_comanda?: string | null;
  observacoes?: string | null;
  duracao_minutos?: number | null;
};

export type ClienteContexto = {
  id: string;
  nome?: string | null;
  telefone?: string | null;
  email?: string | null;
};

export type HistoricoMensagem = {
  papel?: string | null;
  conteudo?: string | null;
};

export type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type SuporteRequestBody = {
  message?: string;
  origemPagina?: string | null;
  idComanda?: string | null;
  idAgendamento?: string | null;
  idCliente?: string | null;
};

export type AcaoProfissional = "criar" | "atualizar" | "atualizar_foto";

export type ProfissionalServicoPayload = {
  id_servico?: string;
  duracao_minutos?: string | number | null;
  ativo?: boolean | null;
};

export type ProfissionalProcessarPayload = Record<string, unknown>;

export type ProfissionalProcessarBody = {
  acao?: AcaoProfissional;
  idSalao?: string;
  idProfissional?: string | null;
  profissional?: ProfissionalProcessarPayload;
  servicos?: ProfissionalServicoPayload[];
  assistentes?: string[];
  foto_url?: string | null;
};

export type ProfissionalProcessarResponse = {
  error?: string;
  idProfissional?: string;
  ok?: boolean;
};

export type ProfissionalContextoRow = {
  id: string;
  nome?: string | null;
  nome_exibicao?: string | null;
  categoria?: string | null;
  cargo?: string | null;
  dias_trabalho?: unknown;
  pausas?: unknown;
  ativo?: boolean | null;
};
