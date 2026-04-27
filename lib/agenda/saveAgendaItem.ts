import type { SupabaseClient } from "@supabase/supabase-js";
import type { Agendamento, Bloqueio, ConfigSalao, Profissional, Servico } from "@/types/agenda";
import {
  addDurationToTime,
  mergeBloqueios,
  normalizeTimeString,
  overlaps,
  timeToMinutes,
} from "@/lib/utils/agenda";

export async function saveAgendaItem(params: {
  supabase: SupabaseClient;
  payload: Record<string, unknown>;
  idSalao: string;
  config: ConfigSalao;
  bloqueios: Bloqueio[];
  agendamentos: Agendamento[];
  profissionais: Profissional[];
  servicos: Servico[];
  ensureDiaFuncionamentoFn: (dateString: string) => boolean;
  getProfessionalAutoBloqueiosFn: (profissionalId: string, date: string) => Bloqueio[];
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

  if (!ensureDiaFuncionamentoFn(String(payload.data || ""))) {
    throw new Error("Esse dia não está configurado como dia de funcionamento.");
  }

  if (payload.tipo === "agendamento") {
    if (!payload.profissionalId || !payload.clienteId || !payload.servicoId) {
      throw new Error("Preencha profissional, cliente e serviço.");
    }

    const servico = servicos.find((s) => s.id === payload.servicoId);
    if (!servico) {
      throw new Error("Selecione um serviço válido.");
    }

    const profissionaisVinculados = servico.profissionais_vinculados || [];
    if (!profissionaisVinculados.includes(String(payload.profissionalId))) {
      throw new Error("Este servico nao esta vinculado ao profissional selecionado.");
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

    if (!validRange.ok) {
      throw new Error(validRange.message);
    }

    const bloqueiosTotais = mergeBloqueios(
      bloqueios.filter(
        (b) => b.data === payload.data && b.profissional_id === payload.profissionalId
      ),
      getProfessionalAutoBloqueiosFn(String(payload.profissionalId), String(payload.data))
    );

    const conflitoBloqueio = bloqueiosTotais.some(
      (b) => b.id !== payload.id && overlaps(horaInicio, horaFim, b.hora_inicio, b.hora_fim)
    );

    if (conflitoBloqueio) {
      throw new Error("Esse horário está bloqueado.");
    }

    if (payload.id) {
      const agendamentoAtual = agendamentos.find((a) => a.id === payload.id);
      const agendamentoInfo = agendamentoAtual as
        | (Agendamento & { id_comanda?: string | null })
        | undefined;

      const idComandaAnterior = agendamentoInfo?.id_comanda || null;
      const idComandaNova = (payload.idComanda as string | null) || null;

      const { error } = await supabase
        .from("agendamentos")
        .update({
          cliente_id: payload.clienteId,
          profissional_id: payload.profissionalId,
          servico_id: payload.servicoId,
          id_comanda: idComandaNova,
          data: payload.data,
          hora_inicio: horaInicio,
          hora_fim: horaFim,
          duracao_minutos: duracao,
          observacoes: payload.observacoes || null,
          status: payload.status || "confirmado",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.id)
        .eq("id_salao", idSalao);

      if (error) {
        console.error(error);
        throw new Error("Erro ao atualizar agendamento.");
      }

      if (idComandaAnterior || idComandaNova) {
        await sincronizarAgendamentoFn({
          idAgendamento: String(payload.id),
          idComandaNova,
          idServico: String(payload.servicoId),
          idProfissional: String(payload.profissionalId),
        });
      }

      return;
    }

    const { data: insertedRows, error } = await supabase
      .from("agendamentos")
      .insert({
        id_salao: idSalao,
        cliente_id: payload.clienteId,
        profissional_id: payload.profissionalId,
        servico_id: payload.servicoId,
        id_comanda: payload.idComanda || null,
        data: payload.data,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        duracao_minutos: duracao,
        observacoes: payload.observacoes || null,
        status: payload.status || "confirmado",
        origem: "manual",
      })
      .select("id")
      .limit(1);

    if (error) {
      console.error(error);
      throw new Error("Erro ao salvar agendamento.");
    }

    const novoAgendamentoId = insertedRows?.[0]?.id;

    if (novoAgendamentoId) {
      await sincronizarAgendamentoFn({
        idAgendamento: novoAgendamentoId,
        idComandaNova: (payload.idComanda as string | null) || null,
        idServico: String(payload.servicoId),
        idProfissional: String(payload.profissionalId),
      });
    }

    return;
  }

  if (payload.tipo === "bloqueio") {
    const horaInicio = normalizeTimeString(String(payload.horaInicio || ""));
    const horaFim = normalizeTimeString(String(payload.horaFim || ""));

    const validRange = validateAgendaTimeRangeFn({
      profissionalId: String(payload.profissionalId),
      date: String(payload.data),
      horaInicio,
      horaFim,
    });

    if (!validRange.ok) {
      throw new Error(validRange.message);
    }

    if (timeToMinutes(horaFim) <= timeToMinutes(horaInicio)) {
      throw new Error("Hora fim deve ser maior que a hora início.");
    }

    const conflitoAgendamento = agendamentos.some(
      (a) =>
        a.profissional_id === payload.profissionalId &&
        a.data === payload.data &&
        overlaps(horaInicio, horaFim, a.hora_inicio, a.hora_fim)
    );

    const conflitoBloqueio = bloqueios.some(
      (b) =>
        b.id !== payload.id &&
        b.profissional_id === payload.profissionalId &&
        b.data === payload.data &&
        overlaps(horaInicio, horaFim, b.hora_inicio, b.hora_fim)
    );

    if (conflitoAgendamento || conflitoBloqueio) {
      throw new Error("Esse intervalo já possui agendamento ou bloqueio.");
    }

    if (payload.id) {
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

      if (error) {
        console.error(error);
        throw new Error("Erro ao atualizar bloqueio.");
      }

      return;
    }

    const { error } = await supabase.from("agenda_bloqueios").insert({
      id_salao: idSalao,
      profissional_id: payload.profissionalId,
      data: payload.data,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      motivo: payload.motivo || null,
    });

    if (error) {
      console.error(error);
      throw new Error("Erro ao salvar bloqueio.");
    }
  }
}
