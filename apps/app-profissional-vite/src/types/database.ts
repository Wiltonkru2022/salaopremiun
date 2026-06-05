export type StatusAgendamento = "pendente" | "confirmado" | "cancelado" | "bloqueado" | "atendido" | "faltou" | "em_atendimento";
export type StatusComanda = "aberta" | "fechada" | "cancelada" | "aguardando_pagamento";

export type Profissional = {
  id: string;
  auth_user_id: string | null;
  id_salao?: string | null;
  nome: string;
  nome_exibicao?: string | null;
  cpf: string;
  telefone: string | null;
  email: string | null;
  whatsapp?: string | null;
  cargo?: string | null;
  categoria?: string | null;
  bio?: string | null;
  pix_chave?: string | null;
  sinal_pix_proprio?: boolean | null;
  sinal_pix_recebedor?: string | null;
  sinal_whatsapp?: string | null;
  nivel_acesso?: string | null;
  ativo: boolean;
  intervalo_agenda_minutos: number;
  horario_funcionamento: HorarioDia[];
};

export type HorarioDia = {
  dia: number;
  ativo: boolean;
  inicio: string;
  fim: string;
};

export type Cliente = {
  id: string;
  profissional_id: string;
  nome: string;
  telefone: string | null;
  whatsapp?: string | null;
  email?: string | null;
  observacoes: string | null;
  credito_total?: number | string | null;
  status?: string | null;
  created_at: string;
};

export type Servico = {
  id: string;
  profissional_id: string;
  nome: string;
  descricao?: string | null;
  preco: number;
  duracao_minutos: number;
  ativo: boolean;
};

export type Agendamento = {
  id: string;
  profissional_id: string;
  cliente_id: string | null;
  servico_id: string | null;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status: StatusAgendamento;
  titulo: string | null;
  observacoes: string | null;
  id_comanda?: string | null;
  sinal_status?: string | null;
  sinal_valor?: number | string | null;
  sinal_comprovante_path?: string | null;
  sinal_comprovante_nome?: string | null;
  sinal_comprovante_tipo?: string | null;
  profissional_nome?: string | null;
  clientes?: Pick<Cliente, "nome" | "telefone"> | null;
  servicos?: Pick<Servico, "nome" | "preco" | "duracao_minutos"> | null;
};

export type Comanda = {
  id: string;
  numero?: number | string | null;
  profissional_id: string;
  cliente_id: string | null;
  cliente_nome: string;
  status: StatusComanda;
  subtotal?: number | string | null;
  desconto?: number | string | null;
  total: number;
  aberta_em: string;
  fechada_em: string | null;
};

export type ItemComanda = {
  id: string;
  comanda_id: string;
  servico_id: string | null;
  tipo: "servico" | "produto";
  nome: string;
  quantidade: number;
  valor_unitario: number;
  total: number;
};

export type Notificacao = {
  id: string;
  profissional_id: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  created_at: string;
};

export type ComissaoLancamento = {
  id: string;
  descricao: string;
  competenciaData: string | null;
  valorBase: number;
  valor: number;
  percentualAplicado: number;
  status: string;
  pagoEm: string | null;
};

export type Avaliacao = {
  id: string;
  nota: number;
  comentario: string | null;
  created_at: string | null;
  cliente_nome: string;
  servico_nome: string;
  profissional_id: string;
  profissional_nome: string;
};

export type ProfissionalResumo = {
  id: string;
  nome: string;
  nome_exibicao?: string | null;
};
