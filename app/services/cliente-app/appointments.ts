import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { cancelarAgendamentoComComanda } from "@/lib/agenda/cancelarAgendamentoComComanda";
import { canSalonAppearInClientApp } from "@/lib/client-app/eligibility";
import {
  ensureDiaFuncionamento,
  validateAgendaTimeRange,
} from "@/lib/agenda/validacoesAgenda";
import {
  addDurationToTime,
  buildForaExpedienteBloqueiosDoProfissional,
  buildPausasBloqueiosDoProfissional,
  mergeBloqueios,
  normalizeTimeString,
  overlaps,
} from "@/lib/utils/agenda";
import type { ConfigSalao, Profissional } from "@/types/agenda";

type ClienteAppActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

type ClienteBookingParams = {
  idSalao: string;
  idCliente: string;
  idServico: string;
  idProfissional: string;
  data: string;
  horaInicio: string;
  observacoes?: string | null;
};

type ClienteCancelParams = {
  idSalao: string;
  idCliente: string;
  idAgendamento: string;
};

type ClienteReviewParams = {
  idSalao: string;
  idCliente: string;
  idAgendamento: string;
  nota: number;
  comentario?: string | null;
};

function normalizeDate(value: string) {
  return String(value || "").trim().slice(0, 10);
}

function isPastDateTime(date: string, time: string) {
  const value = new Date(`${date}T${normalizeTimeString(time)}:00`);
  return Number.isFinite(value.getTime()) && value.getTime() < Date.now();
}

function parseConfigRow(
  row: Record<string, unknown> | null
): ConfigSalao | null {
  if (!row?.id_salao) return null;

  return {
    id_salao: String(row.id_salao),
    hora_abertura: String(row.hora_abertura || "08:00"),
    hora_fechamento: String(row.hora_fechamento || "19:00"),
    intervalo_minutos: Number(row.intervalo_minutos || 15) || 15,
    dias_funcionamento: Array.isArray(row.dias_funcionamento)
      ? row.dias_funcionamento.map((item) => String(item || ""))
      : ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"],
  };
}

function parseProfissionalRow(row: Record<string, unknown>): Profissional {
  return {
    id: String(row.id || ""),
    id_salao: String(row.id_salao || ""),
    nome:
      String(row.nome_exibicao || "").trim() ||
      String(row.nome || "").trim() ||
      "Profissional",
    foto_url: String(row.foto_url || "").trim() || null,
    categoria: String(row.categoria || "").trim() || null,
    cargo: String(row.cargo || "").trim() || null,
    comissao_percentual: Number(row.comissao_percentual || 0) || null,
    cor_agenda: String(row.cor_agenda || "").trim() || null,
    status: String(row.status || "ativo"),
    ativo:
      row.ativo === null || row.ativo === undefined ? true : Boolean(row.ativo),
    dias_trabalho: (row.dias_trabalho as Profissional["dias_trabalho"]) ?? null,
    pausas: (row.pausas as Profissional["pausas"]) ?? null,
  };
}

export async function createClienteAppAppointment(
  params: ClienteBookingParams
): Promise<ClienteAppActionResult> {
  const idSalao = String(params.idSalao || "").trim();
  const idCliente = String(params.idCliente || "").trim();
  const idServico = String(params.idServico || "").trim();
  const idProfissional = String(params.idProfissional || "").trim();
  const data = normalizeDate(params.data);
  const horaInicio = normalizeTimeString(params.horaInicio);
  const observacoes = String(params.observacoes || "").trim() || null;

  if (!idSalao || !idCliente || !idServico || !idProfissional || !data) {
    return { ok: false, error: "Preencha servico, profissional, data e horario." };
  }

  if (isPastDateTime(data, horaInicio)) {
    return {
      ok: false,
      error: "Escolha um horario futuro para criar o agendamento.",
    };
  }

  const elegibilidade = await canSalonAppearInClientApp(idSalao);
  if (!elegibilidade.allowed) {
    return {
      ok: false,
      error: "Este salao nao esta publicado no app cliente agora.",
    };
  }

  return runAdminOperation({
    action: "cliente_app_book_appointment",
    actorId: idCliente,
    idSalao,
    run: async (supabaseAdmin) => {
      const [
        clienteResult,
        configResult,
        profissionalResult,
        servicoResult,
        vinculoResult,
      ] = await Promise.all([
        supabaseAdmin
          .from("clientes")
          .select("id, id_salao, status")
          .eq("id", idCliente)
          .eq("id_salao", idSalao)
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from("configuracoes_salao")
          .select("id_salao, hora_abertura, hora_fechamento, intervalo_minutos, dias_funcionamento")
          .eq("id_salao", idSalao)
          .limit(1)
          .maybeSingle(),
        (supabaseAdmin as any)
          .from("profissionais")
          .select(
            "id, id_salao, nome, nome_exibicao, foto_url, categoria, cargo, comissao_percentual, cor_agenda, status, ativo, dias_trabalho, pausas, app_cliente_visivel, eh_assistente"
          )
          .eq("id", idProfissional)
          .eq("id_salao", idSalao)
          .limit(1)
          .maybeSingle(),
        (supabaseAdmin as any)
          .from("servicos")
          .select(
            "id, id_salao, nome, ativo, preco, duracao, duracao_minutos, descricao, app_cliente_visivel"
          )
          .eq("id", idServico)
          .eq("id_salao", idSalao)
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from("profissional_servicos")
          .select("id, duracao_minutos, ativo")
          .eq("id_salao", idSalao)
          .eq("id_profissional", idProfissional)
          .eq("id_servico", idServico)
          .eq("ativo", true)
          .limit(1)
          .maybeSingle(),
      ]);

      if (
        clienteResult.error ||
        !clienteResult.data?.id ||
        String(clienteResult.data.status || "").toLowerCase() !== "ativo"
      ) {
        return { ok: false, error: "Sua conta de cliente nao esta apta para agendar." };
      }

      const config = parseConfigRow(
        (configResult.data as Record<string, unknown> | null) || null
      );
      if (!config) {
        return {
          ok: false,
          error: "A agenda deste salao ainda nao esta configurada.",
        };
      }

      if (profissionalResult.error || !profissionalResult.data?.id) {
        return { ok: false, error: "Profissional nao encontrado." };
      }

      if (
        !profissionalResult.data.app_cliente_visivel ||
        profissionalResult.data.eh_assistente === true ||
        profissionalResult.data.ativo === false
      ) {
        return {
          ok: false,
          error: "Este profissional nao esta disponivel no app cliente.",
        };
      }

      if (servicoResult.error || !servicoResult.data?.id) {
        return { ok: false, error: "Servico nao encontrado." };
      }

      if (
        !servicoResult.data.app_cliente_visivel ||
        servicoResult.data.ativo === false
      ) {
        return {
          ok: false,
          error: "Este servico nao esta disponivel no app cliente.",
        };
      }

      if (vinculoResult.error || !vinculoResult.data?.id) {
        return {
          ok: false,
          error: "Este servico nao esta vinculado ao profissional escolhido.",
        };
      }

      const profissional = parseProfissionalRow(
        profissionalResult.data as Record<string, unknown>
      );
      const duracao =
        Number(vinculoResult.data.duracao_minutos || 0) ||
        Number(servicoResult.data.duracao_minutos || servicoResult.data.duracao || 0) ||
        30;
      const horaFim = addDurationToTime(horaInicio, duracao);

      if (!ensureDiaFuncionamento({ config, dateString: data })) {
        return {
          ok: false,
          error: "Este dia nao esta disponivel para agendamento no salao.",
        };
      }

      const range = validateAgendaTimeRange({
        config,
        profissionais: [profissional],
        getProfessionalAutoBloqueiosFn: () => [],
        profissionalId: profissional.id,
        date: data,
        horaInicio,
        horaFim,
      });

      if (!range.ok) {
        return { ok: false, error: range.message };
      }

      const [{ data: bloqueios, error: bloqueiosError }, { data: agendamentos, error: agendamentosError }] =
        await Promise.all([
          supabaseAdmin
            .from("agenda_bloqueios")
            .select("id, id_salao, profissional_id, data, hora_inicio, hora_fim, motivo")
            .eq("id_salao", idSalao)
            .eq("profissional_id", idProfissional)
            .eq("data", data),
          supabaseAdmin
            .from("agendamentos")
            .select("id, hora_inicio, hora_fim, status")
            .eq("id_salao", idSalao)
            .eq("profissional_id", idProfissional)
            .eq("data", data)
            .neq("status", "cancelado"),
        ]);

      if (bloqueiosError || agendamentosError) {
        return {
          ok: false,
          error: "Nao foi possivel validar a disponibilidade desse horario.",
        };
      }

      const autoBloqueios = mergeBloqueios(
        buildPausasBloqueiosDoProfissional({
          idSalao,
          profissionalId: idProfissional,
          date: data,
          pausas: profissional.pausas,
        }),
        buildForaExpedienteBloqueiosDoProfissional({
          idSalao,
          profissionalId: idProfissional,
          date: data,
          agendaInicio: config.hora_abertura,
          agendaFim: config.hora_fechamento,
          diasTrabalho: profissional.dias_trabalho,
        })
      );

      const conflitoBloqueio = mergeBloqueios(
        ((bloqueios || []) as Array<Record<string, unknown>>).map((item) => ({
          id: String(item.id || ""),
          id_salao: String(item.id_salao || idSalao),
          profissional_id: String(item.profissional_id || idProfissional),
          data: String(item.data || data),
          hora_inicio: normalizeTimeString(String(item.hora_inicio || "")),
          hora_fim: normalizeTimeString(String(item.hora_fim || "")),
          motivo: String(item.motivo || "").trim() || null,
        })),
        autoBloqueios
      ).some((item) =>
        overlaps(horaInicio, horaFim, item.hora_inicio, item.hora_fim)
      );

      if (conflitoBloqueio) {
        return {
          ok: false,
          error: "Este horario esta bloqueado para o profissional escolhido.",
        };
      }

      const conflitoAgendamento = (
        (agendamentos || []) as Array<Record<string, unknown>>
      ).some((item) =>
        overlaps(
          horaInicio,
          horaFim,
          normalizeTimeString(String(item.hora_inicio || "")),
          normalizeTimeString(String(item.hora_fim || ""))
        )
      );

      if (conflitoAgendamento) {
        return {
          ok: false,
          error: "Este horario ja foi ocupado. Escolha outro horario.",
        };
      }

      const { error: insertError } = await supabaseAdmin.from("agendamentos").insert({
        id_salao: idSalao,
        cliente_id: idCliente,
        profissional_id: idProfissional,
        servico_id: idServico,
        data,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        duracao_minutos: duracao,
        observacoes,
        status: "pendente",
        origem: "app_cliente",
      });

      if (insertError) {
        return {
          ok: false,
          error: "Nao foi possivel salvar seu agendamento agora.",
        };
      }

      return {
        ok: true,
        message: "Agendamento criado com sucesso. O salao ja pode confirmar seu horario.",
      };
    },
  });
}

export async function cancelClienteAppAppointment(
  params: ClienteCancelParams
): Promise<ClienteAppActionResult> {
  const idSalao = String(params.idSalao || "").trim();
  const idCliente = String(params.idCliente || "").trim();
  const idAgendamento = String(params.idAgendamento || "").trim();

  if (!idSalao || !idCliente || !idAgendamento) {
    return { ok: false, error: "Agendamento invalido para cancelamento." };
  }

  return runAdminOperation({
    action: "cliente_app_cancel_appointment",
    actorId: idCliente,
    idSalao,
    run: async (supabaseAdmin) => {
      const { data: agendamento, error } = await supabaseAdmin
        .from("agendamentos")
        .select("id, id_comanda, status")
        .eq("id", idAgendamento)
        .eq("id_salao", idSalao)
        .eq("cliente_id", idCliente)
        .limit(1)
        .maybeSingle();

      if (error || !agendamento?.id) {
        return { ok: false, error: "Agendamento nao encontrado." };
      }

      const status = String(agendamento.status || "").toLowerCase();
      if (status === "cancelado") {
        return { ok: false, error: "Este agendamento ja foi cancelado." };
      }

      if (status === "atendido" || status === "aguardando_pagamento") {
        return {
          ok: false,
          error: "Esse atendimento ja aconteceu e nao pode mais ser cancelado pelo app.",
        };
      }

      if (agendamento.id_comanda) {
        await cancelarAgendamentoComComanda({
          supabase: supabaseAdmin,
          idSalao,
          idAgendamento,
        });
      } else {
        const { error: updateError } = await supabaseAdmin
          .from("agendamentos")
          .update({
            status: "cancelado",
            updated_at: new Date().toISOString(),
          })
          .eq("id", idAgendamento)
          .eq("id_salao", idSalao)
          .eq("cliente_id", idCliente);

        if (updateError) {
          return {
            ok: false,
            error: "Nao foi possivel cancelar o agendamento agora.",
          };
        }
      }

      return {
        ok: true,
        message: "Agendamento cancelado com sucesso.",
      };
    },
  });
}

export async function reviewClienteAppAppointment(
  params: ClienteReviewParams
): Promise<ClienteAppActionResult> {
  const idSalao = String(params.idSalao || "").trim();
  const idCliente = String(params.idCliente || "").trim();
  const idAgendamento = String(params.idAgendamento || "").trim();
  const nota = Number(params.nota || 0);
  const comentario = String(params.comentario || "").trim() || null;

  if (!idSalao || !idCliente || !idAgendamento) {
    return { ok: false, error: "Nao foi possivel identificar o atendimento." };
  }

  if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
    return { ok: false, error: "Escolha uma nota de 1 a 5 para avaliar." };
  }

  return runAdminOperation({
    action: "cliente_app_review_appointment",
    actorId: idCliente,
    idSalao,
    run: async (supabaseAdmin) => {
      const { data: agendamento, error } = await supabaseAdmin
        .from("agendamentos")
        .select("id, status")
        .eq("id", idAgendamento)
        .eq("id_salao", idSalao)
        .eq("cliente_id", idCliente)
        .limit(1)
        .maybeSingle();

      if (error || !agendamento?.id) {
        return { ok: false, error: "Atendimento nao encontrado para avaliacao." };
      }

      const status = String(agendamento.status || "").toLowerCase();
      if (status !== "atendido" && status !== "aguardando_pagamento") {
        return {
          ok: false,
          error: "A avaliacao so pode ser enviada depois do atendimento.",
        };
      }

      const reviewPayload = {
        id_cliente: idCliente,
        id_salao: idSalao,
        id_agendamento: idAgendamento,
        nota,
        comentario,
      };

      const { data: existingReview, error: existingReviewError } =
        await (supabaseAdmin as any)
          .from("clientes_avaliacoes")
          .select("id")
          .eq("id_cliente", idCliente)
          .eq("id_salao", idSalao)
          .eq("id_agendamento", idAgendamento)
          .limit(1)
          .maybeSingle();

      if (existingReviewError) {
        return {
          ok: false,
          error: "Nao foi possivel validar sua avaliacao agora.",
        };
      }

      const reviewMutation = existingReview?.id
        ? await (supabaseAdmin as any)
            .from("clientes_avaliacoes")
            .update({
              nota,
              comentario,
            })
            .eq("id", existingReview.id)
        : await (supabaseAdmin as any)
            .from("clientes_avaliacoes")
            .insert(reviewPayload);

      const reviewError = reviewMutation.error;

      if (reviewError) {
        return {
          ok: false,
          error: "Nao foi possivel salvar sua avaliacao agora.",
        };
      }

      return {
        ok: true,
        message: "Avaliacao enviada com sucesso.",
      };
    },
  });
}
