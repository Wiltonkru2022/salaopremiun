"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  assertCanCreateAgendaInCurrentMonth,
  assertCanMutatePlanFeature,
  PlanAccessError,
} from "@/lib/plans/access";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import {
  buscarConfiguracaoAgendaProfissional,
  buscarConflitosBloqueioNoHorario,
  buscarConflitosNoHorario,
  buscarServicoPorId,
  validarServicoVinculadoAoProfissional,
  validarHorarioAgendamento,
} from "@/app/services/profissional/agenda";
import { normalizeTimeString, timeToMinutes } from "@/lib/utils/agenda";

function buildNovoUrl(
  params: Record<string, string | number | undefined | null>
) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== "") {
      query.set(key, String(value));
    }
  });

  return `/app-profissional/agenda/novo?${query.toString()}`;
}

function buildBloquearUrl(
  params: Record<string, string | number | undefined | null>
) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== "") {
      query.set(key, String(value));
    }
  });

  return `/app-profissional/agenda/bloquear?${query.toString()}`;
}

function isISODate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatDateBR(dateISO: string) {
  const [year, month, day] = dateISO.split("-").map(Number);

  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

function getAgendaMutationErrorMessage(message?: string | null) {
  const value = String(message || "").trim();
  const normalized = value.toLowerCase();

  if (
    normalized.includes("up_agendamentos_slot_inicio_ativo") ||
    normalized.includes("duplicate key value violates unique constraint")
  ) {
    return "Já existe um agendamento ativo nesse profissional, dia e horário. Escolha outro horário ou reagende o atendimento existente.";
  }

  return value || "Erro ao salvar na agenda.";
}

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export async function criarAgendamentoProfissionalAction(formData: FormData) {
  const session = await requireProfissionalAppContext();

  const clienteId = String(formData.get("cliente_id") || "");
  const servicoId = String(formData.get("servico_id") || "");
  const profissionalIdForm = String(formData.get("profissional_id") || "");
  const profissionalId =
    session.podeVerAgendaTodos && profissionalIdForm
      ? profissionalIdForm
      : session.idProfissional;
  const data = String(formData.get("data") || "");
  const horaInicio = String(formData.get("hora_inicio") || "");
  const observacoes = String(formData.get("observacoes") || "");
  const confirmarConflito = String(formData.get("confirmar_conflito") || "");

  const redirectBase = {
    cliente_id: clienteId,
    servico_id: servicoId,
    profissional_id: profissionalId,
    data,
    hora_inicio: horaInicio,
    observacoes,
  };

  try {
    if (!clienteId || !servicoId || !profissionalId || !data || !horaInicio) {
      redirect(
        buildNovoUrl({
          ...redirectBase,
          erro: "Preencha cliente, serviço, profissional, data e horário.",
        })
      );
    }

    await Promise.all([
      assertCanMutatePlanFeature(session.idSalao, "agenda"),
      assertCanMutatePlanFeature(session.idSalao, "servicos"),
      assertCanCreateAgendaInCurrentMonth(session.idSalao),
    ]);

    const [configProfissional, servico] = await Promise.all([
      buscarConfiguracaoAgendaProfissional(session.idSalao, profissionalId),
      buscarServicoPorId(session.idSalao, servicoId),
      validarServicoVinculadoAoProfissional(session.idSalao, profissionalId, servicoId),
    ]);

    if (!configProfissional.ativo) {
      redirect(
        buildNovoUrl({
          ...redirectBase,
          erro: "Profissional inativo.",
        })
      );
    }

    const duracaoMinutos = Number(servico.duracao_minutos || 0) || 60;

    const { horaInicio: inicioValido, horaFim } = validarHorarioAgendamento({
      dataISO: data,
      horaInicio,
      duracaoMinutos,
      diasTrabalho: configProfissional.diasTrabalho,
      pausas: configProfissional.pausas,
    });

    const conflitos = await buscarConflitosNoHorario({
      idSalao: session.idSalao,
      idProfissional: profissionalId,
      dataISO: data,
      horaInicio: inicioValido,
      horaFim,
    });
    const conflitosBloqueio = await buscarConflitosBloqueioNoHorario({
      idSalao: session.idSalao,
      idProfissional: profissionalId,
      dataISO: data,
      horaInicio: inicioValido,
      horaFim,
    });

    if (conflitosBloqueio.length) {
      redirect(
        buildNovoUrl({
          ...redirectBase,
          erro: "Esse horário está bloqueado para o profissional. Escolha outro horário ou remova o bloqueio na agenda.",
        })
      );
    }

    if (conflitos.length && confirmarConflito !== "true") {
      redirect(
        buildNovoUrl({
          ...redirectBase,
          conflito: "1",
          conflito_msg:
            "Já existe atendimento neste horário. Marque a confirmação para agendar mesmo assim.",
        })
      );
    }

    const insertErrorMessage = await runAdminOperation({
      action: "profissional_criar_agendamento",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        const { error } = await supabase.from("agendamentos").insert({
          id_salao: session.idSalao,
          cliente_id: clienteId,
          profissional_id: profissionalId,
          servico_id: servicoId,
          data,
          hora_inicio: `${inicioValido}:00`,
          hora_fim: `${horaFim}:00`,
          status: "pendente",
          duracao_minutos: duracaoMinutos,
          observacoes: observacoes || null,
          origem: "app_profissional",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        return error?.message ?? null;
      },
    });

    if (insertErrorMessage) {
      redirect(
        buildNovoUrl({
          ...redirectBase,
          erro: getAgendaMutationErrorMessage(insertErrorMessage),
        })
      );
    }

    revalidatePath("/app-profissional/agenda");
    revalidatePath("/app-profissional/inicio");

    redirect(
      `/app-profissional/agenda?data=${encodeURIComponent(
        data
      )}&ok=${encodeURIComponent("Agendamento criado com sucesso.")}`
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    const message =
      error instanceof PlanAccessError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erro ao criar agendamento.";

    redirect(
      buildNovoUrl({
        ...redirectBase,
        erro: message,
      })
    );
  }
}

export async function bloquearHorarioProfissionalAction(formData: FormData) {
  const session = await requireProfissionalAppContext();

  const profissionalIdForm = String(formData.get("profissional_id") || "");
  const profissionalId =
    session.podeVerAgendaTodos && profissionalIdForm
      ? profissionalIdForm
      : session.idProfissional;
  let data = String(formData.get("data") || "");
  const datasSelecionadas = Array.from(
    new Set(
      formData
        .getAll("datas")
        .map((value) => String(value || "").trim())
        .filter(isISODate)
    )
  ).sort();
  const datasBloqueio = datasSelecionadas.length
    ? datasSelecionadas
    : isISODate(data)
      ? [data]
      : [];
  data = datasBloqueio[0] || data;
  const horaInicioRaw = String(formData.get("hora_inicio") || "").trim();
  const horaFimRaw = String(formData.get("hora_fim") || "").trim();
  const horaInicio = normalizeTimeString(horaInicioRaw);
  const horaFim = normalizeTimeString(horaFimRaw);
  const motivo = String(formData.get("motivo") || "").trim();

  const redirectBase = {
    profissional_id: profissionalId,
    data: datasBloqueio[0] || data,
    datas: datasBloqueio.join(","),
    hora_inicio: horaInicio,
    hora_fim: horaFim,
    motivo,
  };

  try {
    if (!profissionalId || !datasBloqueio.length || !horaInicioRaw || !horaFimRaw) {
      redirect(
        buildBloquearUrl({
          ...redirectBase,
          erro: "Preencha profissional, selecione pelo menos um dia, hora inicial e hora final.",
        })
      );
    }

    if (timeToMinutes(horaFim) <= timeToMinutes(horaInicio)) {
      redirect(
        buildBloquearUrl({
          ...redirectBase,
          erro: "Hora final precisa ser maior que a hora inicial.",
        })
      );
    }

    await assertCanMutatePlanFeature(session.idSalao, "agenda");

    const configProfissional = await buscarConfiguracaoAgendaProfissional(
      session.idSalao,
      profissionalId
    );

    if (!configProfissional.ativo) {
      redirect(
        buildBloquearUrl({
          ...redirectBase,
          erro: "Profissional inativo.",
        })
      );
    }

    const duracaoBloqueio = timeToMinutes(horaFim) - timeToMinutes(horaInicio);
    const datasInvalidas: string[] = [];

    for (const dataISO of datasBloqueio) {
      try {
        validarHorarioAgendamento({
          dataISO,
          horaInicio,
          duracaoMinutos: duracaoBloqueio,
          diasTrabalho: configProfissional.diasTrabalho,
          pausas: [],
        });
      } catch {
        datasInvalidas.push(dataISO);
      }
    }

    if (datasInvalidas.length) {
      redirect(
        buildBloquearUrl({
          ...redirectBase,
          erro: `Fora do expediente ou dia sem atendimento: ${datasInvalidas
            .map(formatDateBR)
            .join(", ")}.`,
        })
      );
    }

    const conflitosMultiplos = await Promise.all(
      datasBloqueio.map(async (dataISO) => {
        const [agendamentos, bloqueios] = await Promise.all([
          buscarConflitosNoHorario({
            idSalao: session.idSalao,
            idProfissional: profissionalId,
            dataISO,
            horaInicio,
            horaFim,
          }),
          buscarConflitosBloqueioNoHorario({
            idSalao: session.idSalao,
            idProfissional: profissionalId,
            dataISO,
            horaInicio,
            horaFim,
          }),
        ]);

        return agendamentos.length || bloqueios.length ? dataISO : null;
      })
    );
    const datasComConflito = conflitosMultiplos.filter(Boolean) as string[];

    if (datasComConflito.length) {
      redirect(
        buildBloquearUrl({
          ...redirectBase,
          erro: `Ja existe agendamento ou bloqueio nesses dias: ${datasComConflito
            .map(formatDateBR)
            .join(", ")}.`,
        })
      );
    }

    const [conflitosAgendamento, conflitosBloqueio] = await Promise.all([
      buscarConflitosNoHorario({
        idSalao: session.idSalao,
        idProfissional: profissionalId,
        dataISO: data,
        horaInicio,
        horaFim,
      }),
      buscarConflitosBloqueioNoHorario({
        idSalao: session.idSalao,
        idProfissional: profissionalId,
        dataISO: data,
        horaInicio,
        horaFim,
      }),
    ]);

    if (conflitosAgendamento.length || conflitosBloqueio.length) {
      redirect(
        buildBloquearUrl({
          ...redirectBase,
          erro: "Esse intervalo já possui agendamento ou bloqueio.",
        })
      );
    }

    const insertErrorMessage = await runAdminOperation({
      action: "app_profissional_bloquear_horario_multiplos_dias",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        const rows = datasBloqueio.map((dataISO) => ({
          id_salao: session.idSalao,
          profissional_id: profissionalId,
          data: dataISO,
          hora_inicio: horaInicio,
          hora_fim: horaFim,
          motivo: motivo || null,
        }));
        const { error } = await supabase.from("agenda_bloqueios").insert(rows);

        return error?.message ?? null;
      },
    });

    if (insertErrorMessage) {
      redirect(
        buildBloquearUrl({
          ...redirectBase,
          erro: getAgendaMutationErrorMessage(insertErrorMessage),
        })
      );
    }

    revalidatePath("/app-profissional/agenda");
    revalidatePath("/app-profissional/inicio");

    redirect(
      `/app-profissional/agenda?data=${encodeURIComponent(
        data
      )}&ok=${encodeURIComponent("Horário bloqueado com sucesso.")}`
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    const message =
      error instanceof PlanAccessError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erro ao bloquear horário.";

    redirect(
      buildBloquearUrl({
        ...redirectBase,
        erro: getAgendaMutationErrorMessage(message),
      })
    );
  }
}

export async function excluirBloqueioProfissionalAction(formData: FormData) {
  const session = await requireProfissionalAppContext();
  const idBloqueio = String(formData.get("id_bloqueio") || "").trim();
  const data = String(formData.get("data") || "").trim();

  try {
    if (!idBloqueio) throw new Error("Bloqueio invalido.");
    await assertCanMutatePlanFeature(session.idSalao, "agenda");

    const bloqueio = await runAdminOperation({
      action: "app_profissional_bloqueio_buscar_para_excluir",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        let query = supabase
          .from("agenda_bloqueios")
          .select("id, profissional_id, data")
          .eq("id", idBloqueio)
          .eq("id_salao", session.idSalao);

        if (!session.podeVerAgendaTodos) {
          query = query.eq("profissional_id", session.idProfissional);
        }

        const { data: row, error } = await query.maybeSingle();
        if (error) throw new Error(error.message);
        if (!row?.id) throw new Error("Bloqueio nao encontrado.");
        return row;
      },
    });

    await runAdminOperation({
      action: "app_profissional_bloqueio_excluir",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        const { error } = await supabase
          .from("agenda_bloqueios")
          .delete()
          .eq("id", idBloqueio)
          .eq("id_salao", session.idSalao);

        if (error) throw new Error(error.message);
      },
    });

    revalidatePath("/app-profissional/agenda");
    revalidatePath("/app-profissional/inicio");

    const dataDestino = data || String(bloqueio.data || "").slice(0, 10);
    redirect(
      `/app-profissional/agenda?data=${encodeURIComponent(
        dataDestino
      )}&ok=${encodeURIComponent("Bloqueio excluido.")}`
    );
  } catch (error) {
    if (isRedirectError(error)) throw error;

    const message =
      error instanceof PlanAccessError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erro ao excluir bloqueio.";

    redirect(
      `/app-profissional/agenda?data=${encodeURIComponent(
        data
      )}&erro=${encodeURIComponent(message)}`
    );
  }
}
