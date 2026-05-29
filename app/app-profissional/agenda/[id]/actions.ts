"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCanMutatePlanFeature, PlanAccessError } from "@/lib/plans/access";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { notifyClientAppointmentConfirmed } from "@/lib/push-notifications";
import {
  notifyAppointmentCanceled,
  notifyAppointmentFinished,
  notifyAppointmentRescheduled,
  scheduleAppointmentReminderNotifications,
} from "@/lib/notification-jobs";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import {
  buscarConfiguracaoAgendaProfissional,
  buscarConflitosBloqueioNoHorario,
  buscarConflitosNoHorario,
  buscarServicoPorId,
  validarHorarioAgendamento,
} from "@/app/services/profissional/agenda";
import { notifyWaitlistAboutReleasedSlot } from "@/lib/client-app/waitlist";
import { sincronizarAgendamentoComComandaNoCaixa } from "@/lib/agenda/sincronizarAgendamentoComComanda";

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
  return requireProfissionalAppContext();
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

async function buscarAgendamentoPermitido(params: {
  idSalao: string;
  idProfissional: string;
  idAgendamento: string;
  podeVerAgendaTodos?: boolean;
}) {
  return runAdminOperation({
    action: "app_profissional_agendamento_buscar_permitido",
    actorId: params.idProfissional,
    idSalao: params.idSalao,
    run: async (supabase) => {
      let query = (supabase as any)
        .from("agendamentos")
        .select(
          "id, id_salao, profissional_id, cliente_id, servico_id, data, hora_inicio, hora_fim, status, id_comanda, observacoes, duracao_minutos, id_cupom_salao, codigo_cupom, desconto_cupom_valor"
        )
        .eq("id", params.idAgendamento)
        .eq("id_salao", params.idSalao);

      if (!params.podeVerAgendaTodos) {
        query = query.eq("profissional_id", params.idProfissional);
      }

      const { data, error } = await query.maybeSingle();

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
    if (!data || !horaInicio) throw new Error("Informe data e horário.");
    if (!STATUS_PERMITIDOS.has(status)) throw new Error("Status invalido.");
    await assertCanMutatePlanFeature(session.idSalao, "agenda");

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
    const conflitosBloqueio = await buscarConflitosBloqueioNoHorario({
      idSalao: session.idSalao,
      idProfissional: session.idProfissional,
      dataISO: data,
      horaInicio: horario.horaInicio,
      horaFim: horario.horaFim,
    });

    if (conflitosBloqueio.length) {
      redirect(
        buildUrl(
          idAgendamento,
          "erro",
          "Esse horário está bloqueado para o profissional. Escolha outro horário ou remova o bloqueio na agenda."
        )
      );
    }

    if (conflitosDeOutros.length && confirmarConflito !== "true") {
      redirect(
        buildUrl(
          idAgendamento,
          "erro",
          "Já existe outro atendimento neste horário. Marque confirmar conflito para salvar mesmo assim."
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

        if (error) throw new Error(getAgendaMutationErrorMessage(error.message));
      },
    });

    const previousDate = String(agendamento.data || "").slice(0, 10);
    const previousTime = normalizeTime(String(agendamento.hora_inicio || ""));
    if (previousDate !== data || previousTime !== horaInicio) {
      await notifyAppointmentRescheduled({
        idAgendamento,
        idSalao: session.idSalao,
        actor: "profissional",
        previousDate,
        previousTime,
      });

      try {
        await runAdminOperation({
          action: "app_profissional_lista_espera_horario_liberado",
          actorId: session.idProfissional,
          idSalao: session.idSalao,
          run: async (supabaseAdmin) =>
            notifyWaitlistAboutReleasedSlot({
              supabaseAdmin,
              releasedSlot: {
                idSalao: session.idSalao,
                idServico: agendamento.servico_id || null,
                idProfissional: session.idProfissional,
                data: previousDate,
                horaInicio: previousTime,
                servicoNome: servico.nome || null,
              },
            }),
        });
      } catch {
        // O reagendamento ja foi salvo; a lista de espera nao deve travar o fluxo.
      }
    }

    if (
      status === "confirmado" &&
      String(agendamento.status || "").toLowerCase() !== "confirmado"
    ) {
      await notifyClientAppointmentConfirmed({
        idAgendamento,
        idSalao: session.idSalao,
      });
      await scheduleAppointmentReminderNotifications({
        idAgendamento,
        idSalao: session.idSalao,
      });
    }

    if (
      status === "atendido" &&
      String(agendamento.status || "").toLowerCase() !== "atendido"
    ) {
      await notifyAppointmentFinished({
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
      error instanceof PlanAccessError
        ? error.message
        : error instanceof Error
          ? getAgendaMutationErrorMessage(error.message)
          : "Erro ao atualizar agendamento.";
    redirect(buildUrl(idAgendamento || "invalido", "erro", message));
  }
}

export async function marcarClienteNaoCompareceuAction(formData: FormData) {
  const session = await getSessionOrRedirect();
  const idAgendamento = String(formData.get("id_agendamento") || "").trim();

  try {
    if (!idAgendamento) throw new Error("Agendamento invalido.");
    await assertCanMutatePlanFeature(session.idSalao, "agenda");
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
      error instanceof PlanAccessError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erro ao atualizar status.";
    redirect(buildUrl(idAgendamento || "invalido", "erro", message));
  }
}

export async function confirmarAgendamentoProfissionalAction(formData: FormData) {
  const session = await getSessionOrRedirect();
  const idAgendamento = String(formData.get("id_agendamento") || "").trim();

  try {
    if (!idAgendamento) throw new Error("Agendamento invalido.");
    await assertCanMutatePlanFeature(session.idSalao, "agenda");
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
      await scheduleAppointmentReminderNotifications({
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
      error instanceof PlanAccessError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erro ao confirmar agendamento.";
    redirect(buildUrl(idAgendamento || "invalido", "erro", message));
  }
}

export async function confirmarSinalPixProfissionalAction(formData: FormData) {
  const session = await getSessionOrRedirect();
  const idAgendamento = String(formData.get("id_agendamento") || "").trim();

  try {
    if (!idAgendamento) throw new Error("Agendamento invalido.");
    await assertCanMutatePlanFeature(session.idSalao, "agenda");

    const agendamento = await buscarAgendamentoPermitido({
      idSalao: session.idSalao,
      idProfissional: session.idProfissional,
      idAgendamento,
      podeVerAgendaTodos: session.podeVerAgendaTodos,
    });

    const updatedAt = new Date().toISOString();
    await runAdminOperation({
      action: "app_profissional_confirmar_sinal_pix",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        const { data: profissional } = await supabase
          .from("profissionais")
          .select("nome, nome_exibicao, sinal_confirmacao_responsavel")
          .eq("id", agendamento.profissional_id)
          .eq("id_salao", session.idSalao)
          .maybeSingle();

        if (String(profissional?.sinal_confirmacao_responsavel || "") !== "profissional") {
          throw new Error("Este profissional nao esta configurado para confirmar sinais.");
        }

        const { error } = await supabase
          .from("agendamentos")
          .update({
            status: "confirmado",
            sinal_status: "confirmado",
            sinal_confirmado_em: updatedAt,
            sinal_confirmado_por_tipo: "profissional",
            sinal_confirmado_por_id: agendamento.profissional_id,
            sinal_confirmado_por_nome:
              profissional?.nome_exibicao || profissional?.nome || "Profissional",
            reserva_expira_em: null,
            updated_at: updatedAt,
          })
          .eq("id", idAgendamento)
          .eq("id_salao", session.idSalao)
          .eq("profissional_id", agendamento.profissional_id)
          .eq("sinal_confirmacao_responsavel", "profissional");

        if (error) throw new Error(error.message);
      },
    });

    if (String(agendamento.status || "").toLowerCase() !== "confirmado") {
      await notifyClientAppointmentConfirmed({
        idAgendamento,
        idSalao: session.idSalao,
      });
      await scheduleAppointmentReminderNotifications({
        idAgendamento,
        idSalao: session.idSalao,
      });
    }

    revalidatePath("/app-profissional/agenda");
    revalidatePath(`/app-profissional/agenda/${idAgendamento}`);
    revalidatePath("/app-profissional/inicio");
    redirect(buildUrl(idAgendamento, "ok", "Sinal Pix confirmado."));
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message =
      error instanceof PlanAccessError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erro ao confirmar sinal.";
    redirect(buildUrl(idAgendamento || "invalido", "erro", message));
  }
}

export async function recusarSinalPixProfissionalAction(formData: FormData) {
  const session = await getSessionOrRedirect();
  const idAgendamento = String(formData.get("id_agendamento") || "").trim();

  try {
    if (!idAgendamento) throw new Error("Agendamento invalido.");
    await assertCanMutatePlanFeature(session.idSalao, "agenda");

    const agendamento = await buscarAgendamentoPermitido({
      idSalao: session.idSalao,
      idProfissional: session.idProfissional,
      idAgendamento,
      podeVerAgendaTodos: session.podeVerAgendaTodos,
    });

    await runAdminOperation({
      action: "app_profissional_recusar_sinal_pix",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        const { error } = await supabase
          .from("agendamentos")
          .update({
            status: "reservado_aguardando_pagamento",
            sinal_status: "recusado",
            updated_at: new Date().toISOString(),
          })
          .eq("id", idAgendamento)
          .eq("id_salao", session.idSalao)
          .eq("profissional_id", agendamento.profissional_id)
          .eq("sinal_confirmacao_responsavel", "profissional");

        if (error) throw new Error(error.message);
      },
    });

    revalidatePath("/app-profissional/agenda");
    revalidatePath(`/app-profissional/agenda/${idAgendamento}`);
    redirect(buildUrl(idAgendamento, "ok", "Comprovante recusado."));
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message =
      error instanceof PlanAccessError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erro ao recusar sinal.";
    redirect(buildUrl(idAgendamento || "invalido", "erro", message));
  }
}

export async function cancelarAgendamentoProfissionalAction(formData: FormData) {
  const session = await getSessionOrRedirect();
  const idAgendamento = String(formData.get("id_agendamento") || "").trim();

  try {
    if (!idAgendamento) throw new Error("Agendamento invalido.");
    await assertCanMutatePlanFeature(session.idSalao, "agenda");
    const agendamento = await buscarAgendamentoPermitido({
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

    await notifyAppointmentCanceled({
      idSalao: session.idSalao,
      idAgendamento,
      idCliente: agendamento.cliente_id,
      idProfissional: session.idProfissional,
      data: agendamento.data,
      horaInicio: agendamento.hora_inicio,
      actor: "profissional",
    });

    try {
      const servico = await buscarServicoPorId(
        session.idSalao,
        agendamento.servico_id
      );
      await runAdminOperation({
        action: "app_profissional_lista_espera_cancelamento",
        actorId: session.idProfissional,
        idSalao: session.idSalao,
        run: async (supabaseAdmin) =>
          notifyWaitlistAboutReleasedSlot({
            supabaseAdmin,
            releasedSlot: {
              idSalao: session.idSalao,
              idServico: agendamento.servico_id || null,
              idProfissional: session.idProfissional,
              data: String(agendamento.data || "").slice(0, 10),
              horaInicio: normalizeTime(String(agendamento.hora_inicio || "")),
              servicoNome: servico.nome || null,
            },
          }),
      });
    } catch {
      // O cancelamento ja foi salvo; a lista de espera nao deve travar o fluxo.
    }

    revalidatePath("/app-profissional/agenda");
    revalidatePath("/app-profissional/inicio");
    redirect("/app-profissional/agenda?ok=Agendamento%20cancelado.");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message =
      error instanceof PlanAccessError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erro ao cancelar agendamento.";
    redirect(buildUrl(idAgendamento || "invalido", "erro", message));
  }
}

export async function abrirComandaDoAgendamentoAction(formData: FormData) {
  const session = await getSessionOrRedirect();
  const idAgendamento = String(formData.get("id_agendamento") || "").trim();

  try {
    if (!idAgendamento) throw new Error("Agendamento invalido.");
    await Promise.all([
      assertCanMutatePlanFeature(session.idSalao, "agenda"),
      assertCanMutatePlanFeature(session.idSalao, "comandas"),
    ]);
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
            desconto: Number(agendamento.desconto_cupom_valor || 0),
            acrescimo: 0,
            total: 0,
          })
          .select("id")
          .single();

        if (comandaError || !comanda?.id) {
          throw new Error(comandaError?.message || "Erro ao abrir comanda.");
        }

        await sincronizarAgendamentoComComandaNoCaixa({
          supabase,
          idSalao: session.idSalao,
          idAgendamento,
          idComandaNova: String(comanda.id),
          idServico: String(agendamento.servico_id),
          idProfissional: session.idProfissional,
        });

        const { error: updateError } = await supabase
          .from("agendamentos")
          .update({
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
      error instanceof PlanAccessError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erro ao abrir comanda.";
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
    await Promise.all([
      assertCanMutatePlanFeature(session.idSalao, "agenda"),
      assertCanMutatePlanFeature(session.idSalao, "comandas"),
      assertCanMutatePlanFeature(session.idSalao, "caixa"),
    ]);
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
      error instanceof PlanAccessError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erro ao enviar para o caixa.";
    redirect(buildUrl(idAgendamento || "invalido", "erro", message));
  }
}
