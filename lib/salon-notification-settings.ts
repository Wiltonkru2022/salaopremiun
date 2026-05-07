import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type SalonNotificationSettings = {
  clienteAgendamentoConfirmado: boolean;
  clienteLembrete30min: boolean;
  clienteAtendimentoFinalizado: boolean;
  clienteAvaliarAtendimento: boolean;
  clienteReagendamento: boolean;
  clienteCancelamento: boolean;
  profissionalLembrete30min: boolean;
  profissionalAtendimentoFinalizado: boolean;
  profissionalReagendamento: boolean;
  profissionalCancelamento: boolean;
  salaoNovoAgendamentoApp: boolean;
  salaoCancelamentoCliente: boolean;
  salaoReagendamentoCliente: boolean;
  salaoAvaliacoes: boolean;
  lembreteMinutosAntes: number;
};

export const DEFAULT_SALON_NOTIFICATION_SETTINGS: SalonNotificationSettings = {
  clienteAgendamentoConfirmado: true,
  clienteLembrete30min: true,
  clienteAtendimentoFinalizado: true,
  clienteAvaliarAtendimento: true,
  clienteReagendamento: true,
  clienteCancelamento: true,
  profissionalLembrete30min: true,
  profissionalAtendimentoFinalizado: true,
  profissionalReagendamento: true,
  profissionalCancelamento: true,
  salaoNovoAgendamentoApp: true,
  salaoCancelamentoCliente: true,
  salaoReagendamentoCliente: true,
  salaoAvaliacoes: true,
  lembreteMinutosAntes: 30,
};

type SettingsRow = {
  cliente_agendamento_confirmado?: boolean | null;
  cliente_lembrete_30min?: boolean | null;
  cliente_atendimento_finalizado?: boolean | null;
  cliente_avaliar_atendimento?: boolean | null;
  cliente_reagendamento?: boolean | null;
  cliente_cancelamento?: boolean | null;
  profissional_lembrete_30min?: boolean | null;
  profissional_atendimento_finalizado?: boolean | null;
  profissional_reagendamento?: boolean | null;
  profissional_cancelamento?: boolean | null;
  salao_novo_agendamento_app?: boolean | null;
  salao_cancelamento_cliente?: boolean | null;
  salao_reagendamento_cliente?: boolean | null;
  salao_avaliacoes?: boolean | null;
  lembrete_minutos_antes?: number | string | null;
};

function boolValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeSalonNotificationSettings(
  row?: SettingsRow | null
): SalonNotificationSettings {
  const defaults = DEFAULT_SALON_NOTIFICATION_SETTINGS;
  const minutos = Number(row?.lembrete_minutos_antes ?? defaults.lembreteMinutosAntes);

  return {
    clienteAgendamentoConfirmado: boolValue(
      row?.cliente_agendamento_confirmado,
      defaults.clienteAgendamentoConfirmado
    ),
    clienteLembrete30min: boolValue(
      row?.cliente_lembrete_30min,
      defaults.clienteLembrete30min
    ),
    clienteAtendimentoFinalizado: boolValue(
      row?.cliente_atendimento_finalizado,
      defaults.clienteAtendimentoFinalizado
    ),
    clienteAvaliarAtendimento: boolValue(
      row?.cliente_avaliar_atendimento,
      defaults.clienteAvaliarAtendimento
    ),
    clienteReagendamento: boolValue(row?.cliente_reagendamento, defaults.clienteReagendamento),
    clienteCancelamento: boolValue(row?.cliente_cancelamento, defaults.clienteCancelamento),
    profissionalLembrete30min: boolValue(
      row?.profissional_lembrete_30min,
      defaults.profissionalLembrete30min
    ),
    profissionalAtendimentoFinalizado: boolValue(
      row?.profissional_atendimento_finalizado,
      defaults.profissionalAtendimentoFinalizado
    ),
    profissionalReagendamento: boolValue(
      row?.profissional_reagendamento,
      defaults.profissionalReagendamento
    ),
    profissionalCancelamento: boolValue(
      row?.profissional_cancelamento,
      defaults.profissionalCancelamento
    ),
    salaoNovoAgendamentoApp: boolValue(
      row?.salao_novo_agendamento_app,
      defaults.salaoNovoAgendamentoApp
    ),
    salaoCancelamentoCliente: boolValue(
      row?.salao_cancelamento_cliente,
      defaults.salaoCancelamentoCliente
    ),
    salaoReagendamentoCliente: boolValue(
      row?.salao_reagendamento_cliente,
      defaults.salaoReagendamentoCliente
    ),
    salaoAvaliacoes: boolValue(row?.salao_avaliacoes, defaults.salaoAvaliacoes),
    lembreteMinutosAntes: Number.isFinite(minutos)
      ? Math.min(Math.max(Math.round(minutos), 5), 240)
      : defaults.lembreteMinutosAntes,
  };
}

export async function loadSalonNotificationSettings(idSalao: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from("configuracoes_notificacoes")
    .select(
      "cliente_agendamento_confirmado, cliente_lembrete_30min, cliente_atendimento_finalizado, cliente_avaliar_atendimento, cliente_reagendamento, cliente_cancelamento, profissional_lembrete_30min, profissional_atendimento_finalizado, profissional_reagendamento, profissional_cancelamento, salao_novo_agendamento_app, salao_cancelamento_cliente, salao_reagendamento_cliente, salao_avaliacoes, lembrete_minutos_antes"
    )
    .eq("id_salao", idSalao)
    .limit(1)
    .maybeSingle();

  if (error) {
    const message = String(error.message || "");
    if (message.includes("configuracoes_notificacoes") || message.includes("does not exist")) {
      return DEFAULT_SALON_NOTIFICATION_SETTINGS;
    }
    throw new Error(error.message);
  }

  return normalizeSalonNotificationSettings(data as SettingsRow | null);
}

export function mapSettingsToDbPayload(settings: SalonNotificationSettings) {
  return {
    cliente_agendamento_confirmado: settings.clienteAgendamentoConfirmado,
    cliente_lembrete_30min: settings.clienteLembrete30min,
    cliente_atendimento_finalizado: settings.clienteAtendimentoFinalizado,
    cliente_avaliar_atendimento: settings.clienteAvaliarAtendimento,
    cliente_reagendamento: settings.clienteReagendamento,
    cliente_cancelamento: settings.clienteCancelamento,
    profissional_lembrete_30min: settings.profissionalLembrete30min,
    profissional_atendimento_finalizado: settings.profissionalAtendimentoFinalizado,
    profissional_reagendamento: settings.profissionalReagendamento,
    profissional_cancelamento: settings.profissionalCancelamento,
    salao_novo_agendamento_app: settings.salaoNovoAgendamentoApp,
    salao_cancelamento_cliente: settings.salaoCancelamentoCliente,
    salao_reagendamento_cliente: settings.salaoReagendamentoCliente,
    salao_avaliacoes: settings.salaoAvaliacoes,
    lembrete_minutos_antes: settings.lembreteMinutosAntes,
  };
}
