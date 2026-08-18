export const STATUS_AGENDAMENTO = [
  "pendente",
  "confirmado",
  "reservado_aguardando_pagamento",
  "em_atendimento",
  "atendido",
  "cancelado",
  "faltou",
  "bloqueado",
] as const;

export type StatusAgendamento = (typeof STATUS_AGENDAMENTO)[number];

export const STATUS_COMANDA = [
  "aberta",
  "aguardando_pagamento",
  "fechada",
  "cancelada",
] as const;

export type StatusComanda = (typeof STATUS_COMANDA)[number];

export const STATUS_SINAL = [
  "nao_aplicavel",
  "aguardando_pagamento",
  "comprovante_enviado",
  "confirmado",
  "recusado",
  "expirado",
] as const;

export type StatusSinal = (typeof STATUS_SINAL)[number];

export type AgendamentoContract = {
  id: string;
  idSalao: string;
  profissionalId: string;
  clienteId: string | null;
  servicoId: string | null;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: StatusAgendamento | string;
  sinalStatus: StatusSinal | string | null;
  sinalValor: number | null;
  criadoEm: string | null;
};

export type ComissaoContract = {
  id: string;
  profissionalId: string;
  descricao: string;
  competenciaData: string | null;
  valorBase: number;
  percentualAplicado: number;
  valor: number;
  status: "pendente" | "processada" | "paga" | "cancelada" | string;
  pagoEm: string | null;
};

export type NotificacaoContract = {
  id: string;
  profissionalId: string | null;
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: boolean;
  url: string | null;
  criadaEm: string | null;
};

export const CLIENT_FUNNEL_EVENTS = [
  "salao_visualizado",
  "servico_selecionado",
  "horario_selecionado",
  "login_iniciado",
  "reserva_confirmada",
  "sinal_pago",
] as const;

export type ClientFunnelEvent = (typeof CLIENT_FUNNEL_EVENTS)[number];

export const PROFESSIONAL_PRODUCTIVITY_EVENTS = [
  "agendamento_confirmado",
  "comanda_aberta",
  "comanda_finalizada",
  "sincronizacao_falhou",
  "modo_offline_ativado",
  "modo_online_restaurado",
  "agendamento_reagendado",
  "agendamento_cancelado",
  "bloqueio_excluido",
] as const;

export type ProfessionalProductivityEvent =
  (typeof PROFESSIONAL_PRODUCTIVITY_EVENTS)[number];