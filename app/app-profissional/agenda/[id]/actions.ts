"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";
import { notifyClientAppointmentConfirmed } from "@/lib/push-notifications";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import {
  buscarConfiguracaoAgendaProfissional,
  buscarConflitosNoHorario,
  buscarServicoPorId,
  validarHorarioAgendamento,
} from "@/app/services/profissional/agenda";

const STATUS_PERMITIDOS = new Set([
  "pendente",
  "confirmado",
  "em_atendimento",
  "atendido",
  "aguardando_pagamento",
  "cancelado",
  "faltou",
]);

function buildUrl(
  idAgendamento: string,
  key: "ok" | "erro",
  value: string
) {
  return `/app-profissional/agenda/${idAgendamento}?${key}=${encodeURIComponent(
    value
  )}`;
}

function normalizeTime(value: string) {
  return value.slice(0, 5);
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

async function getSessionOrRedirect() {
  const session = await getProfissionalSessionFromCookie();
  if (!session) redirect("/app-profissional/login");
  return session;
}

async function buscarAgendamentoPermitido(params: {
  idSalao: string;
  idProfissional: string;
  idAgendamento: string;
}) {
  return runAdminOperation({
    action: "app_profissional_agendamento_buscar_permitido",
    actorId: params.idProfissional,
    idSalao: params.idSalao,
    run: async (supabase) => {
      const { data, error } = await supabase
        .from("agendamentos")
        .select(
          "id, id_salao, profissional_id, cliente_id, servico_id, data, hora_inicio, hora_fim, status, id_comanda, observacoes, duracao_minutos"
        )
        .eq("id", params.idAgendamento)
        .eq("id_salao", params.idSalao)
        .eq("profissional_id", params.idProfissional)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("Agendamento nao encontrado.");

      return data;
    },
  });
}

export async function atualizarAgendamentoProfissionalAction(
  formData: FormData
) {
  const session = await getSessionOrRedirect();
  const idAgendamento = String(formData.get("id_agendamento") || "").trim();
  const data = String(formData.get("data") || "").trim();
  const horaInicio = normalizeTime(
    String(formData.get("hora_inicio") || "").trim()
  );
  const status = String(formData.get("status") || "").trim();
  const observacoes = String(formData.get("observacoes") || "").trim();
  const confirmarConflito = String(formData.get("confirmar_conflito") || "");

  try {
    if (!idAgendamento) throw new Error("Agendamento invalido.");
    if (!data || !horaInicio) throw new Error("Informe data e horario.");
    if (!STATUS_PERMITIDOS.has(status)) throw new Error("Status invalido.");

    const agendamento = await buscarAgendamentoPermitido({
      idSalao: session.idSalao,
      idProfissional: session.idProfissional,
      idAgendamento,
    });

    const [configProfissional, servico] = await Promise.all([
      buscarConfiguracaoAgendaProfissional(
        session.idSalao,
        session.idProfissional
      ),
      buscarServicoPorId(session.idSalao, agendamento.servico_id),
    ]);

    const duracaoMinutos =
      Number(agendamento.duracao_minutos || servico.duracao_minutos || 0) || 60;
    const horario = validarHorarioAgendamento({
      dataISO: data,
      horaInicio,
      duracaoMinutos,
      diasTrabalho: configProfissional.diasTrabalho,
      pausas: configProfissional.pausas,
    });

    const conflitos = await buscarConflitosNoHorario({
      idSalao: session.idSalao,
      idProfissional: session.idProfissional,
      dataISO: data,
      horaInicio: horario.horaInicio,
      horaFim: horario.horaFim,
    });
    const conflitosDeOutros = conflitos.filter(
      (item) => "id" in item && item.id !== idAgendamento
    );

    if (conflitosDeOutros.length && confirmarConflito !== "true") {
      redirect(
        buildUrl(
          idAgendamento,
          "erro",
          "Ja existe outro atendimento neste horario. Marque confirmar conflito para salvar mesmo assim."
        )
      );
    }

    await runAdminOperation({
      action: "app_profissional_agendamento_atualizar",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        const { error } = await supabase
          .from("agendamentos")
          .update({
            data,
            hora_inicio: `${horario.horaInicio}:00`,
            hora_fim: `${horario.horaFim}:00`,
            status,
            observacoes: observacoes || null,
            duracao_minutos: duracaoMinutos,
            updated_at: new Date().toISOString(),
          })
          .eq("id", idAgendamento)
          .eq("id_salao", session.idSalao)
          .eq("profissional_id", session.idProfissional);

        if (error) throw new Error(error.message);
      },
    });

    if (
      status === "confirmado" &&
      String(agendamento.status || "").toLowerCase() !== "confirmado"
    ) {
      await notifyClientAppointmentConfirmed({
        idAgendamento,
        idSalao: session.idSalao,
      });
    }

    revalidatePath("/app-profissional/agenda");
    revalidatePath(`/app-profissional/agenda/${idAgendamento}`);
    revalidatePath("/app-profissional/inicio");
    redirect(buildUrl(idAgendamento, "ok", "Agendamento atualizado."));
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar agendamento.";
    redirect(buildUrl(idAgendamento || "invalido", "erro", message));
  }
}

export async function marcarClienteNaoCompareceuAction(formData: FormData) {
  const session = await getSessionOrRedirect();
  const idAgendamento = String(formData.get("id_agendamento") || "").trim();

  try {
    if (!idAgendamento) throw new Error("Agendamento invalido.");
    await buscarAgendamentoPermitido({
      idSalao: session.idSalao,
      idProfissional: session.idProfissional,
      idAgendamento,
    });

    await runAdminOperation({
      action: "app_profissional_agendamento_faltou",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        const { error } = await supabase
          .from("agendamentos")
          .update({
            status: "faltou",
            observacoes: "Cliente nao compareceu.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", idAgendamento)
          .eq("id_salao", session.idSalao)
          .eq("profissional_id", session.idProfissional);

        if (error) throw new Error(error.message);
      },
    });

    revalidatePath("/app-profissional/agenda");
    revalidatePath(`/app-profissional/agenda/${idAgendamento}`);
    revalidatePath("/app-profissional/inicio");
    redirect(buildUrl(idAgendamento, "ok", "Cliente marcado como nao compareceu."));
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar status.";
    redirect(buildUrl(idAgendamento || "invalido", "erro", message));
  }
}

export async function confirmarAgendamentoProfissionalAction(formData: FormData) {
  const session = await getSessionOrRedirect();
  const idAgendamento = String(formData.get("id_agendamento") || "").trim();

  try {
    if (!idAgendamento) throw new Error("Agendamento invalido.");
    const agendamento = await buscarAgendamentoPermitido({
      idSalao: session.idSalao,
      idProfissional: session.idProfissional,
      idAgendamento,
    });

    if (String(agendamento.status || "").toLowerCase() !== "confirmado") {
      await runAdminOperation({
        action: "app_profissional_agendamento_confirmar",
        actorId: session.idProfissional,
        idSalao: session.idSalao,
        run: async (supabase) => {
          const { error } = await supabase
            .from("agendamentos")
            .update({
              status: "confirmado",
              updated_at: new Date().toISOString(),
            })
            .eq("id", idAgendamento)
            .eq("id_salao", session.idSalao)
            .eq("profissional_id", session.idProfissional);

          if (error) throw new Error(error.message);
        },
      });

      await notifyClientAppointmentConfirmed({
        idAgendamento,
        idSalao: session.idSalao,
      });
    }

    revalidatePath("/app-profissional/agenda");
    revalidatePath(`/app-profissional/agenda/${idAgendamento}`);
    revalidatePath("/app-profissional/inicio");
    redirect(buildUrl(idAgendamento, "ok", "Agendamento confirmado."));
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message =
      error instanceof Error ? error.message : "Erro ao confirmar agendamento.";
    redirect(buildUrl(idAgendamento || "invalido", "erro", message));
  }
}

export async function cancelarAgendamentoProfissionalAction(formData: FormData) {
  const session = await getSessionOrRedirect();
  const idAgendamento = String(formData.get("id_agendamento") || "").trim();

  try {
    if (!idAgendamento) throw new Error("Agendamento invalido.");
    await buscarAgendamentoPermitido({
      idSalao: session.idSalao,
      idProfissional: session.idProfissional,
      idAgendamento,
    });

    await runAdminOperation({
      action: "app_profissional_agendamento_cancelar",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        const { error } = await supabase
          .from("agendamentos")
          .update({
            status: "cancelado",
            observacoes: "Agendamento cancelado pelo app profissional.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", idAgendamento)
          .eq("id_salao", session.idSalao)
          .eq("profissional_id", session.idProfissional);

        if (error) throw new Error(error.message);
      },
    });

    revalidatePath("/app-profissional/agenda");
    revalidatePath("/app-profissional/inicio");
    redirect("/app-profissional/agenda?ok=Agendamento%20cancelado.");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message =
      error instanceof Error ? error.message : "Erro ao cancelar agendamento.";
    redirect(buildUrl(idAgendamento || "invalido", "erro", message));
  }
}

export async function abrirComandaDoAgendamentoAction(formData: FormData) {
  const session = await getSessionOrRedirect();
  const idAgendamento = String(formData.get("id_agendamento") || "").trim();

  try {
    if (!idAgendamento) throw new Error("Agendamento invalido.");
    const agendamento = await buscarAgendamentoPermitido({
      idSalao: session.idSalao,
      idProfissional: session.idProfissional,
      idAgendamento,
    });

    if (agendamento.id_comanda) {
      redirect(`/app-profissional/comandas/${agendamento.id_comanda}`);
    }

    const idComanda = await runAdminOperation({
      action: "app_profissional_agendamento_abrir_comanda",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        const { data: ultimaComandaRows, error: ultimaError } = await supabase
          .from("comandas")
          .select("numero")
          .eq("id_salao", session.idSalao)
          .order("numero", { ascending: false })
          .limit(1);

        if (ultimaError) throw new Error(ultimaError.message);
        const numero = Number(ultimaComandaRows?.[0]?.numero || 0) + 1;

        const { data: comanda, error: comandaError } = await supabase
          .from("comandas")
          .insert({
            id_salao: session.idSalao,
            numero,
            id_cliente: agendamento.cliente_id,
            status: "aberta",
            origem: "app_profissional_agenda",
            observacoes: agendamento.observacoes || null,
            subtotal: 0,
            desconto: 0,
            acrescimo: 0,
            total: 0,
          })
          .select("id")
          .single();

        if (comandaError || !comanda?.id) {
          throw new Error(comandaError?.message || "Erro ao abrir comanda.");
        }

        const { error: updateError } = await supabase
          .from("agendamentos")
          .update({
            id_comanda: comanda.id,
            status: "em_atendimento",
            updated_at: new Date().toISOString(),
          })
          .eq("id", idAgendamento)
          .eq("id_salao", session.idSalao)
          .eq("profissional_id", session.idProfissional);

        if (updateError) throw new Error(updateError.message);

        const { error: comandaUpdateError } = await supabase
          .from("comandas")
          .update({ id_agendamento_principal: idAgendamento })
          .eq("id", comanda.id)
          .eq("id_salao", session.idSalao);

        if (comandaUpdateError) throw new Error(comandaUpdateError.message);

        return String(comanda.id);
      },
    });

    revalidatePath("/app-profissional/agenda");
    revalidatePath("/app-profissional/comandas");
    revalidatePath("/app-profissional/inicio");
    redirect(
      `/app-profissional/comandas/${idComanda}?ok=${encodeURIComponent(
        "Comanda aberta a partir do agendamento."
      )}`
    );
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message =
      error instanceof Error ? error.message : "Erro ao abrir comanda.";
    redirect(buildUrl(idAgendamento || "invalido", "erro", message));
  }
}

export async function enviarComandaDoAgendamentoParaCaixaAction(
  formData: FormData
) {
  const session = await getSessionOrRedirect();
  const idAgendamento = String(formData.get("id_agendamento") || "").trim();

  try {
    if (!idAgendamento) throw new Error("Agendamento invalido.");
    const agendamento = await buscarAgendamentoPermitido({
      idSalao: session.idSalao,
      idProfissional: session.idProfissional,
      idAgendamento,
    });

    if (!agendamento.id_comanda) {
      throw new Error("Abra uma comanda antes de enviar para o caixa.");
    }
    const idComanda = agendamento.id_comanda;

    await runAdminOperation({
      action: "app_profissional_agendamento_enviar_comanda_caixa",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        const { data: comanda, error: comandaError } = await supabase
          .from("comandas")
          .select("id, id_cliente, status, observacoes, desconto, acrescimo")
          .eq("id", idComanda)
          .eq("id_salao", session.idSalao)
          .maybeSingle();

        if (comandaError || !comanda) {
          throw new Error("Comanda nao encontrada.");
        }

        if (String(comanda.status).toLowerCase() !== "aberta") {
          throw new Error("Somente comandas abertas podem ir para o caixa.");
        }

        const { count, error: itensError } = await supabase
          .from("comanda_itens")
          .select("id", { count: "exact", head: true })
          .eq("id_comanda", idComanda)
          .eq("id_salao", session.idSalao)
          .eq("ativo", true);

        if (itensError) throw new Error("Erro ao validar itens da comanda.");
        if (!count) {
          throw new Error("Adicione pelo menos um item na comanda antes do caixa.");
        }

        const { error: envioError } = await supabase.rpc(
          "fn_enviar_comanda_para_pagamento",
          {
            p_id_salao: session.idSalao,
            p_id_comanda: idComanda,
            p_id_cliente: (comanda.id_cliente || null) as unknown as string,
            p_observacoes: (comanda.observacoes || null) as unknown as string,
            p_desconto: Number(comanda.desconto || 0),
            p_acrescimo: Number(comanda.acrescimo || 0),
          }
        );

        if (envioError) {
          throw new Error(
            envioError.message || "Erro ao enviar comanda para o caixa."
          );
        }

        const { error: agendamentoError } = await supabase
          .from("agendamentos")
          .update({
            status: "aguardando_pagamento",
            updated_at: new Date().toISOString(),
          })
          .eq("id", idAgendamento)
          .eq("id_salao", session.idSalao)
          .eq("profissional_id", session.idProfissional);

        if (agendamentoError) throw new Error(agendamentoError.message);
      },
    });

    revalidatePath("/app-profissional/agenda");
    revalidatePath(`/app-profissional/agenda/${idAgendamento}`);
    revalidatePath("/app-profissional/comandas");
    revalidatePath("/app-profissional/inicio");
    redirect(buildUrl(idAgendamento, "ok", "Comanda enviada para o caixa."));
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message =
      error instanceof Error ? error.message : "Erro ao enviar para o caixa.";
    redirect(buildUrl(idAgendamento || "invalido", "erro", message));
  }
}
