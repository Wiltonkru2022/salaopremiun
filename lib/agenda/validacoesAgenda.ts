import type { Bloqueio, ConfigSalao, Profissional } from "@/types/agenda";
import {
  isDiaFuncionamento,
  normalizeTimeString,
  sanitizeDiasFuncionamento,
  timeToMinutes,
} from "@/lib/utils/agenda";

export function ensureDiaFuncionamento(params: {
  config: ConfigSalao | null;
  dateString: string;
}) {
  const { config, dateString } = params;

  if (!config) return true;

  const configInfo = config as ConfigSalao & {
    dias_funcionamento?: string[] | null;
  };

  const dias = sanitizeDiasFuncionamento(configInfo.dias_funcionamento ?? []);
  const date = new Date(`${dateString}T12:00:00`);

  return isDiaFuncionamento(date, dias);
}

export function getProfessionalAutoBloqueios(_params: {
  profissionais: Profissional[];
  idSalao: string;
  config: ConfigSalao | null;
  profissionalId: string;
  date: string;
}): Bloqueio[] {
  return [];
}

export function validateAgendaTimeRange(params: {
  config: ConfigSalao | null;
  profissionais: Profissional[];
  getProfessionalAutoBloqueiosFn: (profissionalId: string, date: string) => Bloqueio[];
  profissionalId: string;
  date: string;
  horaInicio: string;
  horaFim: string;
}) {
  const {
    config,
    profissionais,
    getProfessionalAutoBloqueiosFn,
    profissionalId,
    date,
    horaInicio,
    horaFim,
  } = params;

  if (!config) {
    return { ok: false, message: "Configuracao do salao nao carregada." };
  }

  const salonStart = normalizeTimeString(config.hora_abertura);
  const salonEnd = normalizeTimeString(config.hora_fechamento);

  if (timeToMinutes(horaInicio) < timeToMinutes(salonStart)) {
    return { ok: false, message: "Horario antes da abertura do salao." };
  }

  if (timeToMinutes(horaFim) > timeToMinutes(salonEnd)) {
    return { ok: false, message: "Horario apos o fechamento do salao." };
  }

  const profissional = profissionais.find((p) => p.id === profissionalId);
  if (!profissional) {
    return { ok: false, message: "Profissional nao encontrado." };
  }

  void date;
  void getProfessionalAutoBloqueiosFn;

  return { ok: true, message: "" };
}
