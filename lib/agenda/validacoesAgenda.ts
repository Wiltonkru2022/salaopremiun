import type { Bloqueio, ConfigSalao, Profissional } from "@/types/agenda";
import {
  getHorarioProfissionalNoDia,
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

  const profissional = profissionais.find((p) => p.id === profissionalId);
  if (!profissional) {
    return { ok: false, message: "Profissional nao encontrado." };
  }

  const horarioProfissional = getHorarioProfissionalNoDia(
    new Date(`${date}T12:00:00`),
    profissional.dias_trabalho
  );
  const agendaStart = normalizeTimeString(
    horarioProfissional?.inicio || config.hora_abertura
  );
  const agendaEnd = normalizeTimeString(
    horarioProfissional?.fim || config.hora_fechamento
  );

  if (timeToMinutes(horaInicio) < timeToMinutes(agendaStart)) {
    return { ok: false, message: "Horario antes da abertura da agenda." };
  }

  if (timeToMinutes(horaFim) > timeToMinutes(agendaEnd)) {
    return { ok: false, message: "Horario apos o fechamento da agenda." };
  }

  void getProfessionalAutoBloqueiosFn;

  return { ok: true, message: "" };
}
