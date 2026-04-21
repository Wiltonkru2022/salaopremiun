"use client";

import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";
import { useCallback } from "react";
import type { AgendaPageTone } from "@/components/agenda/page-types";
import { cancelarAgendamentoComComanda } from "@/lib/agenda/cancelarAgendamentoComComanda";
import { saveAgendaItem } from "@/lib/agenda/saveAgendaItem";
import { monitorClientOperation } from "@/lib/monitoring/client";
import { mergeBloqueios } from "@/lib/utils/agenda";
import type {
  Agendamento,
  Bloqueio,
  ConfigSalao,
  Profissional,
  Servico,
} from "@/types/agenda";
import { normalizeTimeString, overlaps } from "@/lib/utils/agenda";
import {
  ensureDiaFuncionamento,
  getProfessionalAutoBloqueios,
  validateAgendaTimeRange,
} from "@/lib/agenda/validacoesAgenda";

function addMinutesToTime(time: string, minutes: number) {
  const normalized = normalizeTimeString(time);
  const [hours, mins] = normalized.split(":").map(Number);
  const totalMinutes = hours * 60 + mins + minutes;

  return normalizeTimeString(
    `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(
      totalMinutes % 60
    ).padStart(2, "0")}`
  );
}

type UseAgendaMutationsParams = {
  supabase: ReturnType<typeof import("@/lib/supabase/client").createClient>;
  idSalao: string;
  config: ConfigSalao | null;
  modalMode: "agendamento" | "bloqueio";
  editingItem: Agendamento | null;
  editingBlock: Bloqueio | null;
  profissionais: Profissional[];
  servicos: Servico[];
  agendamentos: Agendamento[];
  bloqueios: Bloqueio[];
  loadAgendaSeqRef: MutableRefObject<number>;
  loadAgenda: () => Promise<void>;
  safeGetAuthUser: () => Promise<{ id: string } | null>;
  sincronizarAgendamento: (params: {
    idAgendamento: string;
    idComandaNova: string | null;
    idServico: string;
    idProfissional: string;
  }) => Promise<void>;
  bloquearSeAssinaturaInvalida: () => boolean;
  abrirAviso: (
    title: string,
    message: string,
    tone?: AgendaPageTone,
    redirectTo?: string | null
  ) => void;
  abrirConfirmacao: (params: {
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: AgendaPageTone;
    onConfirm: () => Promise<void>;
  }) => void;
  abrirMotivoExclusao: (params: {
    title: string;
    message: string;
    onConfirm: (value: string) => Promise<void>;
  }) => void;
  setModalOpen: (open: boolean) => void;
  setEditingItem: (item: Agendamento | null) => void;
  setEditingBlock: (block: Bloqueio | null) => void;
  setAgendamentos: Dispatch<SetStateAction<Agendamento[]>>;
};

export function useAgendaMutations({
  supabase,
  idSalao,
  config,
  modalMode,
  editingItem,
  editingBlock,
  profissionais,
  servicos,
  agendamentos,
  bloqueios,
  loadAgendaSeqRef,
  loadAgenda,
  safeGetAuthUser,
  sincronizarAgendamento,
  bloquearSeAssinaturaInvalida,
  abrirAviso,
  abrirConfirmacao,
  abrirMotivoExclusao,
  setModalOpen,
  setEditingItem,
  setEditingBlock,
  setAgendamentos,
}: UseAgendaMutationsParams) {
  const handleSave = useCallback(
    async (payload: Record<string, unknown>) => {
      if (bloquearSeAssinaturaInvalida()) return;
      if (!config || !idSalao) return;

      try {
        await monitorClientOperation(
          {
            module: "agenda",
            action: "salvar_item",
            screen: "agenda_modal",
            entity: String(payload.tipo || modalMode || "agenda_item"),
            details: {
              idSalao,
              modalMode,
              editingItemId: editingItem?.id || null,
              editingBlockId: editingBlock?.id || null,
            },
            successMessage: "Item da agenda salvo com sucesso.",
            errorMessage: "Falha ao salvar item da agenda.",
          },
          () =>
            saveAgendaItem({
              supabase,
              payload,
              idSalao,
              config,
              bloqueios,
              agendamentos,
              profissionais,
              servicos,
              ensureDiaFuncionamentoFn: (dateString: string) =>
                ensureDiaFuncionamento({ config, dateString }),
              getProfessionalAutoBloqueiosFn: (
                profissionalId: string,
                date: string
              ) =>
                getProfessionalAutoBloqueios({
                  profissionais,
                  idSalao,
                  config,
                  profissionalId,
                  date,
                }),
              validateAgendaTimeRangeFn: (params) =>
                validateAgendaTimeRange({
                  config,
                  profissionais,
                  getProfessionalAutoBloqueiosFn: (profissionalId, date) =>
                    getProfessionalAutoBloqueios({
                      profissionais,
                      idSalao,
                      config,
                      profissionalId,
                      date,
                    }),
                  ...params,
                }),
              sincronizarAgendamentoFn: sincronizarAgendamento,
            })
        );

        setModalOpen(false);
        setEditingItem(null);
        setEditingBlock(null);
        await loadAgenda();
      } catch (error: unknown) {
        console.error(error);
        abrirAviso(
          "Erro",
          error instanceof Error ? error.message : "Erro ao salvar item da agenda.",
          "danger"
        );
      }
    },
    [
      agendamentos,
      bloquearSeAssinaturaInvalida,
      bloqueios,
      config,
      editingBlock,
      editingItem,
      idSalao,
      loadAgenda,
      modalMode,
      profissionais,
      servicos,
      setEditingBlock,
      setEditingItem,
      setModalOpen,
      sincronizarAgendamento,
      supabase,
      abrirAviso,
    ]
  );

  const handleResizeEvent = useCallback(
    async (item: Agendamento, newDuration: number) => {
      if (bloquearSeAssinaturaInvalida()) return;
      if (!config) return;

      const startTime = normalizeTimeString(item.hora_inicio);
      const novoFim = addMinutesToTime(startTime, newDuration);

      const validRange = validateAgendaTimeRange({
        config,
        profissionais,
        getProfessionalAutoBloqueiosFn: (profissionalId, date) =>
          getProfessionalAutoBloqueios({
            profissionais,
            idSalao,
            config,
            profissionalId,
            date,
          }),
        profissionalId: item.profissional_id,
        date: item.data,
        horaInicio: startTime,
        horaFim: novoFim,
      });

      if (!validRange.ok) {
        abrirAviso("Horário inválido", validRange.message, "warning");
        return;
      }

      const bloqueiosTotais = mergeBloqueios(
        bloqueios.filter(
          (b) => b.data === item.data && b.profissional_id === item.profissional_id
        ),
        getProfessionalAutoBloqueios({
          profissionais,
          idSalao,
          config,
          profissionalId: item.profissional_id,
          date: item.data,
        })
      );

      const conflitoBloqueio = bloqueiosTotais.some((b) =>
        overlaps(startTime, novoFim, b.hora_inicio, b.hora_fim)
      );

      if (conflitoBloqueio) {
        abrirAviso(
          "Conflito com bloqueio",
          "Não foi possível redimensionar por conflito com bloqueio.",
          "warning"
        );
        return;
      }

      const agendamentosAntes = agendamentos;
      const updatedAt = new Date().toISOString();
      loadAgendaSeqRef.current += 1;
      setAgendamentos((prev) =>
        prev.map((agendamento) =>
          agendamento.id === item.id
            ? {
                ...agendamento,
                duracao_minutos: newDuration,
                hora_fim: novoFim,
                updated_at: updatedAt,
              }
            : agendamento
        )
      );

      const { error } = await monitorClientOperation(
        {
          module: "agenda",
          action: "redimensionar_agendamento",
          screen: "agenda_grid",
          entity: "agendamento",
          entityId: item.id,
          details: {
            idSalao,
            profissionalId: item.profissional_id,
            data: item.data,
            novaDuracao: newDuration,
            novoFim,
          },
          successMessage: "Agendamento redimensionado com sucesso.",
          errorMessage: "Falha ao redimensionar agendamento.",
        },
        async () =>
          await supabase
            .from("agendamentos")
            .update({
              duracao_minutos: newDuration,
              hora_fim: novoFim,
              updated_at: updatedAt,
            })
            .eq("id", item.id)
      );

      if (error) {
        setAgendamentos(agendamentosAntes);
        console.error(error);
        abrirAviso("Erro", "Erro ao atualizar duração.", "danger");
        return;
      }

      if (item.id_comanda) {
        try {
          await monitorClientOperation(
            {
              module: "agenda",
              action: "sincronizar_comanda_agendamento",
              screen: "agenda_grid",
              entity: "agendamento",
              entityId: item.id,
              details: {
                idSalao,
                idComanda: item.id_comanda,
              },
              successMessage: "Agendamento sincronizado com a comanda.",
              errorMessage: "Falha ao sincronizar agendamento com a comanda.",
            },
            () =>
              sincronizarAgendamento({
                idAgendamento: item.id,
                idComandaNova: item.id_comanda || null,
                idServico: item.servico_id,
                idProfissional: item.profissional_id,
              })
          );
        } catch (error: unknown) {
          console.error("Erro ao sincronizar comanda do agendamento:", error);
          abrirAviso(
            "Agenda atualizada",
            "A agenda foi atualizada, mas a comanda vinculada precisa ser conferida.",
            "warning"
          );
        }
      }

      void loadAgenda();
    },
    [
      agendamentos,
      bloquearSeAssinaturaInvalida,
      bloqueios,
      config,
      idSalao,
      loadAgenda,
      loadAgendaSeqRef,
      profissionais,
      setAgendamentos,
      sincronizarAgendamento,
      supabase,
      abrirAviso,
    ]
  );

  const handleMoveEvent = useCallback(
    async (item: Agendamento, move: { newDate: string; newStartTime: string }) => {
      if (bloquearSeAssinaturaInvalida()) return;
      if (!config) return;

      if (!ensureDiaFuncionamento({ config, dateString: move.newDate })) {
        abrirAviso(
          "Dia indisponível",
          "Esse dia não está configurado como dia de funcionamento.",
          "warning"
        );
        return;
      }

      const startTime = normalizeTimeString(move.newStartTime);
      const novoFim = addMinutesToTime(startTime, item.duracao_minutos);

      const validRange = validateAgendaTimeRange({
        config,
        profissionais,
        getProfessionalAutoBloqueiosFn: (profissionalId, date) =>
          getProfessionalAutoBloqueios({
            profissionais,
            idSalao,
            config,
            profissionalId,
            date,
          }),
        profissionalId: item.profissional_id,
        date: move.newDate,
        horaInicio: startTime,
        horaFim: novoFim,
      });

      if (!validRange.ok) {
        abrirAviso("Horário inválido", validRange.message, "warning");
        return;
      }

      const bloqueiosTotais = mergeBloqueios(
        bloqueios.filter(
          (b) =>
            b.data === move.newDate && b.profissional_id === item.profissional_id
        ),
        getProfessionalAutoBloqueios({
          profissionais,
          idSalao,
          config,
          profissionalId: item.profissional_id,
          date: move.newDate,
        })
      );

      const conflitoBloqueio = bloqueiosTotais.some((b) =>
        overlaps(startTime, novoFim, b.hora_inicio, b.hora_fim)
      );

      if (conflitoBloqueio) {
        abrirAviso(
          "Conflito com bloqueio",
          "Não foi possível mover por conflito com bloqueio.",
          "warning"
        );
        return;
      }

      const agendamentosAntes = agendamentos;
      const updatedAt = new Date().toISOString();
      loadAgendaSeqRef.current += 1;
      setAgendamentos((prev) =>
        prev.map((agendamento) =>
          agendamento.id === item.id
            ? {
                ...agendamento,
                data: move.newDate,
                hora_inicio: startTime,
                hora_fim: novoFim,
                updated_at: updatedAt,
              }
            : agendamento
        )
      );

      const { error } = await monitorClientOperation(
        {
          module: "agenda",
          action: "mover_agendamento",
          screen: "agenda_grid",
          entity: "agendamento",
          entityId: item.id,
          details: {
            idSalao,
            profissionalId: item.profissional_id,
            novaData: move.newDate,
            novoInicio: startTime,
            novoFim,
          },
          successMessage: "Agendamento movido com sucesso.",
          errorMessage: "Falha ao mover agendamento.",
        },
        async () =>
          await supabase
            .from("agendamentos")
            .update({
              data: move.newDate,
              hora_inicio: startTime,
              hora_fim: novoFim,
              updated_at: updatedAt,
            })
            .eq("id", item.id)
      );

      if (error) {
        setAgendamentos(agendamentosAntes);
        console.error(error);
        abrirAviso("Erro", "Erro ao mover agendamento.", "danger");
        return;
      }

      if (item.id_comanda) {
        try {
          await monitorClientOperation(
            {
              module: "agenda",
              action: "sincronizar_comanda_agendamento",
              screen: "agenda_grid",
              entity: "agendamento",
              entityId: item.id,
              details: {
                idSalao,
                idComanda: item.id_comanda,
              },
              successMessage: "Agendamento sincronizado com a comanda.",
              errorMessage: "Falha ao sincronizar agendamento com a comanda.",
            },
            () =>
              sincronizarAgendamento({
                idAgendamento: item.id,
                idComandaNova: item.id_comanda || null,
                idServico: item.servico_id,
                idProfissional: item.profissional_id,
              })
          );
        } catch (error: unknown) {
          console.error("Erro ao sincronizar comanda do agendamento:", error);
          abrirAviso(
            "Agenda atualizada",
            "O agendamento foi movido, mas a comanda vinculada precisa ser conferida.",
            "warning"
          );
        }
      }

      void loadAgenda();
    },
    [
      agendamentos,
      bloquearSeAssinaturaInvalida,
      bloqueios,
      config,
      idSalao,
      loadAgenda,
      loadAgendaSeqRef,
      profissionais,
      setAgendamentos,
      sincronizarAgendamento,
      supabase,
      abrirAviso,
    ]
  );

  const handleDeleteEvent = useCallback(
    async (item: Agendamento) => {
      if (bloquearSeAssinaturaInvalida()) return;

      abrirConfirmacao({
        title: "Excluir agendamento",
        message: "Deseja excluir este agendamento? Esta ação não poderá ser desfeita.",
        confirmLabel: "Excluir",
        tone: "danger",
        onConfirm: async () => {
          await sincronizarAgendamento({
            idAgendamento: item.id,
            idComandaNova: null,
            idServico: item.servico_id,
            idProfissional: item.profissional_id,
          });

          const { error } = await supabase
            .from("agendamentos")
            .delete()
            .eq("id", item.id);

          if (error) {
            console.error(error);
            throw new Error("Erro ao excluir agendamento.");
          }

          await loadAgenda();
        },
      });
    },
    [
      bloquearSeAssinaturaInvalida,
      loadAgenda,
      sincronizarAgendamento,
      supabase,
      abrirConfirmacao,
    ]
  );

  const handleQuickStatusChange = useCallback(
    async (
      item: Agendamento,
      nextStatus:
        | "confirmado"
        | "pendente"
        | "atendido"
        | "aguardando_pagamento"
        | "cancelado"
    ) => {
      if (bloquearSeAssinaturaInvalida()) return;

      const updatedAt = new Date().toISOString();

      const { error } = await monitorClientOperation(
        {
          module: "agenda",
          action: "alterar_status_agendamento",
          screen: "agenda_grid",
          entity: "agendamento",
          entityId: item.id,
          details: {
            idSalao,
            statusAtual: item.status,
            proximoStatus: nextStatus,
          },
          successMessage: "Status do agendamento atualizado.",
          errorMessage: "Falha ao atualizar status do agendamento.",
        },
        async () =>
          await supabase
            .from("agendamentos")
            .update({
              status: nextStatus,
              updated_at: updatedAt,
            })
            .eq("id", item.id)
      );

      if (error) {
        console.error(error);
        abrirAviso("Erro", "Nao foi possivel atualizar o status.", "danger");
        return;
      }

      await loadAgenda();
    },
    [
      bloquearSeAssinaturaInvalida,
      idSalao,
      loadAgenda,
      supabase,
      abrirAviso,
    ]
  );

  const handleCancelAppointment = useCallback(
    async (item: Agendamento) => {
      if (bloquearSeAssinaturaInvalida()) return;

      abrirConfirmacao({
        title: "Cancelar agendamento",
        message:
          "Deseja cancelar este agendamento? Os itens vinculados serão removidos da comanda. Se a comanda ficar sem itens, ela será cancelada automaticamente.",
        confirmLabel: "Cancelar agendamento",
        tone: "warning",
        onConfirm: async () => {
          await cancelarAgendamentoComComanda({
            supabase,
            idAgendamento: item.id,
          });

          setModalOpen(false);
          setEditingItem(null);
          await loadAgenda();
        },
      });
    },
    [
      bloquearSeAssinaturaInvalida,
      loadAgenda,
      setEditingItem,
      setModalOpen,
      supabase,
      abrirConfirmacao,
    ]
  );

  const handleDeleteBlock = useCallback(
    async (block: Bloqueio) => {
      if (bloquearSeAssinaturaInvalida()) return;

      abrirMotivoExclusao({
        title: "Excluir bloqueio",
        message: "Informe o motivo da exclusão do bloqueio.",
        onConfirm: async (motivoExclusao: string) => {
          const user = await safeGetAuthUser();

          const { error: logError } = await supabase
            .from("agenda_bloqueios_logs")
            .insert({
              bloqueio_id: block.id,
              id_salao: idSalao,
              profissional_id: block.profissional_id,
              data: block.data,
              hora_inicio: block.hora_inicio,
              hora_fim: block.hora_fim,
              motivo_original: block.motivo || null,
              motivo_exclusao: motivoExclusao || null,
              deleted_by: user?.id || null,
            });

          if (logError) {
            console.error(logError);
            throw new Error("Erro ao salvar log da exclusão do bloqueio.");
          }

          const { error } = await supabase
            .from("agenda_bloqueios")
            .delete()
            .eq("id", block.id);

          if (error) {
            console.error(error);
            throw new Error("Erro ao excluir bloqueio.");
          }

          await loadAgenda();
        },
      });
    },
    [
      bloquearSeAssinaturaInvalida,
      idSalao,
      loadAgenda,
      safeGetAuthUser,
      supabase,
      abrirMotivoExclusao,
    ]
  );

  const handleMoveBlock = useCallback(
    async (
      block: Bloqueio,
      newStartTime: string,
      newEndTime: string,
      newDate?: string
    ) => {
      if (bloquearSeAssinaturaInvalida()) return;
      if (!config) return;

      const targetDate = newDate || block.data;

      if (!ensureDiaFuncionamento({ config, dateString: targetDate })) {
        abrirAviso(
          "Dia indisponível",
          "Esse dia não está configurado como dia de funcionamento.",
          "warning"
        );
        return;
      }

      const validRange = validateAgendaTimeRange({
        config,
        profissionais,
        getProfessionalAutoBloqueiosFn: (profissionalId, date) =>
          getProfessionalAutoBloqueios({
            profissionais,
            idSalao,
            config,
            profissionalId,
            date,
          }),
        profissionalId: block.profissional_id,
        date: targetDate,
        horaInicio: newStartTime,
        horaFim: newEndTime,
      });

      if (!validRange.ok) {
        abrirAviso("Horário inválido", validRange.message, "warning");
        return;
      }

      const conflitoAgendamento = agendamentos.some(
        (a) =>
          a.profissional_id === block.profissional_id &&
          a.data === targetDate &&
          overlaps(newStartTime, newEndTime, a.hora_inicio, a.hora_fim)
      );

      const conflitoBloqueio = bloqueios.some(
        (b) =>
          b.id !== block.id &&
          b.profissional_id === block.profissional_id &&
          b.data === targetDate &&
          overlaps(newStartTime, newEndTime, b.hora_inicio, b.hora_fim)
      );

      if (conflitoAgendamento || conflitoBloqueio) {
        abrirAviso(
          "Conflito de horário",
          "Não foi possível mover o bloqueio por conflito de horário.",
          "warning"
        );
        return;
      }

      const { error } = await supabase
        .from("agenda_bloqueios")
        .update({
          data: targetDate,
          hora_inicio: newStartTime,
          hora_fim: newEndTime,
        })
        .eq("id", block.id);

      if (error) {
        console.error(error);
        abrirAviso("Erro", "Erro ao mover bloqueio.", "danger");
        return;
      }

      await loadAgenda();
    },
    [
      agendamentos,
      bloquearSeAssinaturaInvalida,
      bloqueios,
      config,
      idSalao,
      loadAgenda,
      profissionais,
      supabase,
      abrirAviso,
    ]
  );

  const handleResizeBlock = useCallback(
    async (block: Bloqueio, newEndTime: string) => {
      if (bloquearSeAssinaturaInvalida()) return;
      if (!config) return;

      const horaInicio = normalizeTimeString(block.hora_inicio);
      const horaFim = normalizeTimeString(newEndTime);

      const validRange = validateAgendaTimeRange({
        config,
        profissionais,
        getProfessionalAutoBloqueiosFn: (profissionalId, date) =>
          getProfessionalAutoBloqueios({
            profissionais,
            idSalao,
            config,
            profissionalId,
            date,
          }),
        profissionalId: block.profissional_id,
        date: block.data,
        horaInicio,
        horaFim,
      });

      if (!validRange.ok) {
        abrirAviso("Horário inválido", validRange.message, "warning");
        return;
      }

      const conflitoAgendamento = agendamentos.some(
        (a) =>
          a.profissional_id === block.profissional_id &&
          a.data === block.data &&
          overlaps(horaInicio, horaFim, a.hora_inicio, a.hora_fim)
      );

      const conflitoBloqueio = bloqueios.some(
        (b) =>
          b.id !== block.id &&
          b.profissional_id === block.profissional_id &&
          b.data === block.data &&
          overlaps(horaInicio, horaFim, b.hora_inicio, b.hora_fim)
      );

      if (conflitoAgendamento || conflitoBloqueio) {
        abrirAviso(
          "Conflito de horário",
          "Não foi possível redimensionar o bloqueio por conflito.",
          "warning"
        );
        return;
      }

      const { error } = await supabase
        .from("agenda_bloqueios")
        .update({
          hora_fim: horaFim,
        })
        .eq("id", block.id);

      if (error) {
        console.error(error);
        abrirAviso("Erro", "Erro ao redimensionar bloqueio.", "danger");
        return;
      }

      await loadAgenda();
    },
    [
      agendamentos,
      bloquearSeAssinaturaInvalida,
      bloqueios,
      config,
      idSalao,
      loadAgenda,
      profissionais,
      supabase,
      abrirAviso,
    ]
  );

  return {
    handleSave,
    handleResizeEvent,
    handleMoveEvent,
    handleDeleteEvent,
    handleQuickStatusChange,
    handleCancelAppointment,
    handleDeleteBlock,
    handleMoveBlock,
    handleResizeBlock,
  };
}
