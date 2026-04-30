"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCanCreateAgendaInCurrentMonth, PlanAccessError } from "@/lib/plans/access";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import {
  buscarConfiguracaoAgendaProfissional,
  buscarServicoPorId,
  validarHorarioAgendamento,
  validarServicoVinculadoAoProfissional,
} from "@/app/services/profissional/agenda";

function buildNovaComandaUrl(
  params: Record<string, string | number | undefined | null>
) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== "") {
      query.set(key, String(value));
    }
  });

  return `/app-profissional/comandas/nova?${query.toString()}`;
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

function normalizeTime(value: string) {
  return value.slice(0, 5);
}

export async function criarComandaProfissionalAction(formData: FormData) {
  const session = await getProfissionalSessionFromCookie();

  if (!session) {
    redirect("/app-profissional/login");
  }

  const clienteId = String(formData.get("cliente_id") || "").trim();
  const servicoId = String(formData.get("servico_id") || "").trim();
  const data = String(formData.get("data") || "").trim();
  const horaInicio = normalizeTime(
    String(formData.get("hora_inicio") || "").trim()
  );
  const observacoes = String(formData.get("observacoes") || "").trim();

  const redirectBase = {
    cliente_id: clienteId,
    servico_id: servicoId,
    data,
    hora_inicio: horaInicio,
    observacoes,
  };

  try {
    if (!clienteId || !servicoId || !data || !horaInicio) {
      redirect(
        buildNovaComandaUrl({
          ...redirectBase,
          erro: "Preencha cliente, servico, data e horario.",
        })
      );
    }

    await assertCanCreateAgendaInCurrentMonth(session.idSalao);

    const [configProfissional, servico] = await Promise.all([
      buscarConfiguracaoAgendaProfissional(
        session.idSalao,
        session.idProfissional
      ),
      buscarServicoPorId(session.idSalao, servicoId),
      validarServicoVinculadoAoProfissional(
        session.idSalao,
        session.idProfissional,
        servicoId
      ),
    ]);

    if (!configProfissional.ativo) {
      redirect(
        buildNovaComandaUrl({
          ...redirectBase,
          erro: "Profissional inativo.",
        })
      );
    }

    const duracaoMinutos = Number(servico.duracao_minutos || 0) || 60;
    const { horaFim } = validarHorarioAgendamento({
      dataISO: data,
      horaInicio,
      duracaoMinutos,
      diasTrabalho: configProfissional.diasTrabalho,
      pausas: configProfissional.pausas,
    });

    const idComanda = await runAdminOperation({
      action: "app_profissional_criar_comanda",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabaseAdmin) => {
        const { data: cliente, error: clienteError } = await supabaseAdmin
          .from("clientes")
          .select("id")
          .eq("id", clienteId)
          .eq("id_salao", session.idSalao)
          .maybeSingle();

        if (clienteError) throw new Error(clienteError.message);
        if (!cliente?.id) throw new Error("Cliente nao encontrado.");

        const { data: ultimaComandaRows, error: ultimaError } =
          await supabaseAdmin
            .from("comandas")
            .select("numero")
            .eq("id_salao", session.idSalao)
            .order("numero", { ascending: false })
            .limit(1);

        if (ultimaError) throw new Error(ultimaError.message);

        const numero = Number(ultimaComandaRows?.[0]?.numero || 0) + 1;
        const agora = new Date().toISOString();

        const { data: comanda, error: comandaError } = await supabaseAdmin
          .from("comandas")
          .insert({
            id_salao: session.idSalao,
            numero,
            id_cliente: clienteId,
            status: "aberta",
            origem: "app_profissional",
            observacoes: observacoes || null,
            subtotal: 0,
            desconto: 0,
            acrescimo: 0,
            total: 0,
          })
          .select("id")
          .single();

        if (comandaError || !comanda?.id) {
          throw new Error(comandaError?.message || "Erro ao criar comanda.");
        }

        const { data: agendamento, error: agendamentoError } =
          await supabaseAdmin
            .from("agendamentos")
            .insert({
              id_salao: session.idSalao,
              cliente_id: clienteId,
              profissional_id: session.idProfissional,
              servico_id: servicoId,
              data,
              hora_inicio: `${horaInicio}:00`,
              hora_fim: `${horaFim}:00`,
              status: "em_atendimento",
              duracao_minutos: duracaoMinutos,
              observacoes: observacoes || "Comanda aberta pelo app profissional.",
              origem: "app_profissional_comanda",
              id_comanda: comanda.id,
              created_at: agora,
              updated_at: agora,
            })
            .select("id")
            .single();

        if (agendamentoError || !agendamento?.id) {
          await supabaseAdmin.from("comandas").delete().eq("id", comanda.id);
          throw new Error(
            agendamentoError?.message || "Erro ao vincular agenda a comanda."
          );
        }

        const { error: updateError } = await supabaseAdmin
          .from("comandas")
          .update({ id_agendamento_principal: agendamento.id })
          .eq("id", comanda.id)
          .eq("id_salao", session.idSalao);

        if (updateError) throw new Error(updateError.message);

        return String(comanda.id);
      },
    });

    revalidatePath("/app-profissional/comandas");
    revalidatePath("/app-profissional/agenda");
    revalidatePath("/app-profissional/inicio");

    redirect(
      `/app-profissional/comandas/${idComanda}?ok=${encodeURIComponent(
        "Comanda criada no app profissional."
      )}`
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
          : "Erro ao criar comanda.";

    redirect(
      buildNovaComandaUrl({
        ...redirectBase,
        erro: message,
      })
    );
  }
}
