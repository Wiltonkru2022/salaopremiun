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
  buscarConflitosNoHorario,
  buscarServicoPorId,
  validarServicoVinculadoAoProfissional,
  validarHorarioAgendamento,
} from "@/app/services/profissional/agenda";

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
          erro: insertErrorMessage || "Erro ao criar agendamento.",
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
