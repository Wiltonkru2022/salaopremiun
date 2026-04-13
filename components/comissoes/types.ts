export type StatusComissao = "pendente" | "paga" | "cancelada";

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