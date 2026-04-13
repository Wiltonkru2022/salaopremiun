import type { Bloqueio, ConfigSalao, Profissional } from "@/types/agenda";
import {
  buildForaExpedienteBloqueiosDoProfissional,
  buildPausasBloqueiosDoProfissional,
  getHorarioProfissionalNoDia,
  isDiaFuncionamento,
  mergeBloqueios,
  normalizeTimeString,
  overlaps,
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

export function getProfessionalAutoBloqueios(params: {
  profissionais: Profissional[];
  idSalao: string;
  config: ConfigSalao | null;
  profissionalId: string;
  date: string;
}): Bloqueio[] {
  const { profissionais, idSalao, config, profissionalId, date } = params;

  const profissional = profissionais.find((p) => p.id === profissionalId);
  if (!profissional || !idSalao || !config) return [];

  const profissionalInfo = profissional as Profissional & {
    dias_trabalho?: unknown;
    pausas?: unknown;
  };

  const foraExpediente = buildForaExpedienteBloqueiosDoProfissional({
    idSalao,
    profissionalId,
    date,
    agendaInicio: normalizeTimeString(config.hora_abertura),
    agendaFim: normalizeTimeString(config.hora_fechamento),
    diasTrabalho: profissionalInfo.dias_trabalho,
  });

  const pausas = buildPausasBloqueiosDoProfissional({
    idSalao,
    profissionalId,
    date,
    pausas: profissionalInfo.pausas,
  });

  return mergeBloqueios([], [...foraExpediente, ...pausas]);
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
    return { ok: false, message: "Configuração do salão não carregada." };
  }

  const salonStart = normalizeTimeString(config.hora_abertura);
  const salonEnd = normalizeTimeString(config.hora_fechamento);

  if (timeToMinutes(horaInicio) < timeToMinutes(salonStart)) {
    return { ok: false, message: "Horário antes da abertura do salão." };
  }

  if (timeToMinutes(horaFim) > timeToMinutes(salonEnd)) {
    return { ok: false, message: "Horário após o fechamento do salão." };
  }

  const profissional = profissionais.find((p) => p.id === profissionalId);
  if (!profissional) {
    return { ok: false, message: "Profissional não encontrado." };
  }

  const profissionalInfo = profissional as Profissional & {
    dias_trabalho?: unknown;
  };

  const dateObj = new Date(`${date}T12:00:00`);
  const horarioProfissional = getHorarioProfissionalNoDia(dateObj, profissionalInfo.dias_trabalho);

  if (!horarioProfissional) {
    return { ok: false, message: "Esse profissional não atende nesse dia." };
  }

  if (timeToMinutes(horaInicio) < timeToMinutes(horarioProfissional.inicio)) {
    return {
      ok: false,
      message: "Horário antes do início de atendimento do profissional.",
    };
  }

  if (timeToMinutes(horaFim) > timeToMinutes(horarioProfissional.fim)) {
    return {
      ok: false,
      message: "Horário após o fim de atendimento do profissional.",
    };
  }

  const bloqueiosAuto = getProfessionalAutoBloqueiosFn(profissionalId, date);

  const bateEmBloqueioAuto = bloqueiosAuto.some((b) =>
    overlaps(horaInicio, horaFim, b.hora_inicio, b.hora_fim)
  );

  if (bateEmBloqueioAuto) {
    return {
      ok: false,
      message: "Esse horário entra em pausa ou fora do expediente do profissional.",
    };
  }

  return { ok: true, message: "" };
}