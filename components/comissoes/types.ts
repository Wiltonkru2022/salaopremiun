import type { StatusComissao } from "@/lib/domain/status";

export type ComissaoItem = {
  id: string;
  id_salao: string;
  id_comanda?: string | null;
  id_comanda_item?: string | null;
  id_profissional: string;
  id_assistente?: string | null;
  tipo_profissional: "profissional" | "assistente";
  descricao: string;
  percentual?: number | null;
  valor_base?: number | null;
  valor_comissao: number;
  status: StatusComissao;
  competencia_data?: string | null;
  pago_em?: string | null;
  observacoes?: string | null;
  criado_em?: string | null;
  updated_at?: string | null;

  profissionais?: {
    nome: string;
  } | null;

  assistente_ref?: {
    nome: string;
  } | null;
};

export type ComissaoProfissional = {
  id: string;
  nome: string;
};

export type ComissaoPermissoes = Record<string, boolean>;

export type ComissaoResumo = {
  total: number;
  pendente: number;
  pago: number;
  cancelado: number;
};

export type ComissaoRow = {
  id: string;
  id_profissional: string | null;
  tipo?: string | null;
  tipo_destinatario?: string | null;
  descricao: string | null;
  competencia_data: string | null;
  valor_base: number | null;
  percentual_aplicado: number | null;
  origem_percentual: string | null;
  valor_comissao: number | null;
  valor_comissao_assistente: number | null;
  status: string | null;
  criado_em?: string | null;
  pago_em?: string | null;
  observacoes?: string | null;
  profissionais?: { nome: string } | null;
};

export type ComissaoConfirmacao = {
  acao: "cancelar" | "marcar_pago";
  ids: string[];
};
