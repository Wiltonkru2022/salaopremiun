import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Agendamento,
  Bloqueio,
  ConfigSalao,
  Profissional,
  Servico,
} from "@/types/agenda";
import {
  addDurationToTime,
  mergeBloqueios,
  normalizeTimeString,
  overlaps,
  timeToMinutes,
} from "@/lib/utils/agenda";

const STATUS_SEM_CONFLITO = new Set(["cancelado", "faltou", "atendido", "expirado"]);

export async function saveAgendaItem(params: {
  supabase: SupabaseClient;
  payload: Record<string, unknown>;
  idSalao: string;
  config: ConfigSalao;
  bloqueios: Bloqueio[];
  agendamentos: Agendamento[];
  profissionais: Profissional[];
  servicos: Servico[];
  agendaMonthlyLimit?: number | null;
  ensureDiaFuncionamentoFn: (dateString: string) => boolean;
  getProfessionalAutoBloqueiosFn: (
    profissionalId: string,
    date: string
  ) => Bloqueio[];
  validateAgendaTimeRangeFn: (params: {
    profissionalId: string;
    date: string;
    horaInicio: string;
    horaFim: string;
  }) => { ok: boolean; message: string };
  sincronizarAgendamentoFn: (params: {
    idAgendamento: string;
    idComandaNova: string | null;
    idServico: string;
    idProfissional: string;
  }) => Promise<void>;
}) {
  const {
    supabase,
    payload,
    idSalao,
    bloqueios,
    agendamentos,
    servicos,
    ensureDiaFuncionamentoFn,
    getProfessionalAutoBloqueiosFn,
    validateAgendaTimeRangeFn,
    sincronizarAgendamentoFn,
  } = params;

  if (payload.tipo === "agendamento") {
    if (!ensureDiaFuncionamentoFn(String(payload.data || ""))) {
      throw new Error("Esse dia não está configurado como dia de funcionamento.");
    }

    if (!payload.profissionalId || !payload.clienteId || !payload.servicoId) {
      throw new Error("Preencha profissional, cliente e serviço.");
    }

    const servico = servicos.find((item) => item.id === payload.servicoId);
    if (!servico) throw new Error("Selecione um serviço válido.");

    const profissionaisVinculados = servico.profissionais_vinculados || [];
    if (!profissionaisVinculados.includes(String(payload.profissionalId))) {
      throw new Error("Este serviço não está vinculado ao profissional selecionado.");
    }

    const servicoInfo = servico as Servico & { duracao_minutos?: number | null };
    const duracao = servicoInfo.duracao_minutos || 30;
    const horaInicio = normalizeTimeString(String(payload.horaInicio || ""));
    const horaFim = addDurationToTime(horaInicio, duracao);

    const validRange = validateAgendaTimeRangeFn({
      profissionalId: String(payload.profissionalId),
      date: String(payload.data),
      horaInicio,
      horaFim,
    });
    if (!validRange.ok) throw new Error(validRange.message);

    const bloqueiosTotais = mergeBloqueios(
      bloqueios.filter(
        (item) =>
          item.data === payload.data &&
          item.profissional_id === payload.profissionalId
      ),
      getProfessionalAutoBloqueiosFn(
        String(payload.profissionalId),
        String(payload.data)
      )
    );
    const conflitoBloqueio = bloqueiosTotais.some(
      (item) =>
        item.id !== payload.id &&
        overlaps(horaInicio, horaFim, item.hora_inicio, item.hora_fim)
    );
    const conflitoAgendamento = agendamentos.some(
      (item) =>
        item.id !== payload.id &&
        item.profissional_id === payload.profissionalId &&
        item.data === payload.data &&
        !STATUS_SEM_CONFLITO.has(String(item.status || "").toLowerCase()) &&
        overlaps(horaInicio, horaFim, item.hora_inicio, item.hora_fim)
    );

    if (conflitoAgendamento || conflitoBloqueio) {
      throw new Error("Esse horário já possui outro agendamento ou bloqueio.");
    }

    const idComandaNova = (payload.idComanda as string | null) || null;
    const response = await fetch("/api/painel/agendamentos/salvar", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idAgendamento: payload.id || null,
        idCliente: payload.clienteId,
        idProfissional: payload.profissionalId,
        idServico: payload.servicoId,
        idComanda: idComandaNova,
        data: payload.data,
        horaInicio,
        observacoes: payload.observacoes || null,
        status: payload.status || "confirmado",
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      throw new Error(String(result.error || "Erro ao salvar agendamento."));
    }

    const idAgendamento = String(result.idAgendamento || payload.id || "");
    if (!idAgendamento) throw new Error("Agendamento salvo sem identificador.");

    const agendamentoAtual = payload.id
      ? agendamentos.find((item) => item.id === payload.id)
      : null;
    const idComandaAnterior =
      (agendamentoAtual as (Agendamento & { id_comanda?: string | null }) | null)
        ?.id_comanda || null;

    if (idComandaAnterior || idComandaNova) {
      await sincronizarAgendamentoFn({
        idAgendamento,
        idComandaNova,
        idServico: String(payload.servicoId),
        idProfissional: String(payload.profissionalId),
      });
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("salaopremium:agenda:saved", {
          detail: {
            profissionalId: String(payload.profissionalId),
            data: String(payload.data || ""),
            idAgendamento,
          },
        })
      );
    }

    return;
  }

  if (payload.tipo === "bloqueio") {
    const datasBloqueio =
      payload.id || !Array.isArray(payload.datas)
        ? [String(payload.data || "")]
        : Array.from(
            new Set(
              payload.datas
                .map((item) => String(item || "").trim())
                .filter(Boolean)
            )
          ).sort();

    const horaInicio = normalizeTimeString(String(payload.horaInicio || ""));
    const horaFim = normalizeTimeString(String(payload.horaFim || ""));

    if (timeToMinutes(horaFim) <= timeToMinutes(horaInicio)) {
      throw new Error("A hora final deve ser maior que a hora inicial.");
    }

    const datasForaFuncionamento = datasBloqueio.filter(
      (data) => !ensureDiaFuncionamentoFn(data)
    );
    if (datasForaFuncionamento.length) {
      throw new Error(
        `Estes dias não estão configurados como funcionamento: ${datasForaFuncionamento.join(", ")}.`
      );
    }

    if (payload.id) {
      const validRange = validateAgendaTimeRangeFn({
        profissionalId: String(payload.profissionalId),
        date: String(payload.data),
        horaInicio,
        horaFim,
      });
      if (!validRange.ok) throw new Error(validRange.message);

      const conflitoAgendamento = agendamentos.some(
        (item) =>
          item.profissional_id === payload.profissionalId &&
          item.data === payload.data &&
          !STATUS_SEM_CONFLITO.has(String(item.status || "").toLowerCase()) &&
          overlaps(horaInicio, horaFim, item.hora_inicio, item.hora_fim)
      );
      const conflitoBloqueio = bloqueios.some(
        (item) =>
          item.id !== payload.id &&
          item.profissional_id === payload.profissionalId &&
          item.data === payload.data &&
          overlaps(horaInicio, horaFim, item.hora_inicio, item.hora_fim)
      );
      if (conflitoAgendamento || conflitoBloqueio) {
        throw new Error("Esse intervalo já possui agendamento ou bloqueio.");
      }

      const { error } = await supabase
        .from("agenda_bloqueios")
        .update({
          profissional_id: payload.profissionalId,
          data: payload.data,
          hora_inicio: horaInicio,
          hora_fim: horaFim,
          motivo: payload.motivo || null,
        })
        .eq("id", payload.id)
        .eq("id_salao", idSalao);
      if (error) throw new Error("Erro ao atualizar bloqueio.");
      return;
    }

    const datasComConflito: string[] = [];
    for (const data of datasBloqueio) {
      const validRange = validateAgendaTimeRangeFn({
        profissionalId: String(payload.profissionalId),
        date: data,
        horaInicio,
        horaFim,
      });
      if (!validRange.ok) throw new Error(validRange.message);

      const conflitoAgendamento = agendamentos.some(
        (item) =>
          item.profissional_id === payload.profissionalId &&
          item.data === data &&
          !STATUS_SEM_CONFLITO.has(String(item.status || "").toLowerCase()) &&
          overlaps(horaInicio, horaFim, item.hora_inicio, item.hora_fim)
      );
      const conflitoBloqueio = bloqueios.some(
        (item) =>
          item.profissional_id === payload.profissionalId &&
          item.data === data &&
          overlaps(horaInicio, horaFim, item.hora_inicio, item.hora_fim)
      );
      if (conflitoAgendamento || conflitoBloqueio) datasComConflito.push(data);
    }

    if (datasComConflito.length) {
      throw new Error(
        `Esse intervalo já possui agendamento ou bloqueio em: ${datasComConflito.join(", ")}.`
      );
    }

    const { error } = await supabase.from("agenda_bloqueios").insert(
      datasBloqueio.map((data) => ({
        id_salao: idSalao,
        profissional_id: payload.profissionalId,
        data,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        motivo: payload.motivo || null,
      }))
    );
    if (error) throw new Error("Erro ao salvar bloqueio.");
  }
}
