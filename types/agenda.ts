export type ViewMode = "day" | "week";
export type AgendaDensityMode = "standard" | "reception";

export type StatusAgenda =
  | "confirmado"
  | "pendente"
  | "atendido"
  | "cancelado"
  | "aguardando_pagamento"
  | "bloqueado";

export type DiaTrabalhoProfissional = {
  dia: string;
  inicio: string;
  fim: string;
  ativo: boolean;
};

export type PausaProfissional = {
  inicio: string;
  fim: string;
  descricao?: string | null;
};

export type Profissional = {
  id: string;
  id_salao?: string;
  nome: string;
  foto_url: string | null;
  categoria: string | null;
  cargo?: string | null;
  comissao_percentual: number | null;
  tipo_profissional?: string | null;
  cor_agenda: string | null;
  status: string;
  ativo?: boolean | null;
  dias_trabalho?: DiaTrabalhoProfissional[] | string | null;
  pausas?: PausaProfissional[] | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Cliente = {
  id: string;
  nome: string;
  whatsapp?: string | null;
};

export type Servico = {
  id: string;
  nome: string;
  duracao_minutos: number;
  preco: number;
  preco_padrao?: number | null;
  custo_produto?: number | null;
  comissao_percentual?: number | null;
  comissao_percentual_padrao?: number | null;
  comissao_assistente_percentual?: number | null;
  base_calculo?: string | null;
  desconta_taxa_maquininha?: boolean | null;
  profissionais_vinculados?: string[];
  eh_combo?: boolean | null;
  combo_resumo?: string | null;
};

export type ConfigSalao = {
  id_salao: string;
  hora_abertura: string;
  hora_fechamento: string;
  intervalo_minutos: number;
  dias_funcionamento: string[];
};

export type Agendamento = {
  id: string;
  id_salao: string;
  cliente_id: string;
  profissional_id: string;
  servico_id: string;
  id_comanda?: string | null;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  duracao_minutos: number;
  observacoes: string | null;
  status: StatusAgenda;
  origem: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  comanda_numero?: number | null;
  comanda_status?: string | null;

  cliente?: {
    nome: string;
    whatsapp?: string | null;
  };

  servico?: {
    nome: string;
    duracao_minutos: number;
    preco: number;
  };
};

export type OrigemBloqueio =
  | "manual"
  | "pausa_profissional"
  | "fora_expediente_profissional"
  | null;

export type Bloqueio = {
  id: string;
  id_salao: string;
  profissional_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  motivo: string | null;
  origem?: OrigemBloqueio;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AgendaBloqueioLog = {
  id: string;
  bloqueio_id: string | null;
  id_salao: string;
  profissional_id: string | null;
  data: string | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  motivo_original: string | null;
  motivo_exclusao: string | null;
  deleted_by: string | null;
  created_at?: string | null;
};

export type TimeSlot = {
  time: string;
  minutes: number;
};
