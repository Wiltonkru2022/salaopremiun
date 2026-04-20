"use client";

import { useCallback } from "react";
import type { AgendaPageTone } from "@/components/agenda/page-types";
import { ensureDiaFuncionamento } from "@/lib/agenda/validacoesAgenda";
import type { Agendamento, Bloqueio, ConfigSalao } from "@/types/agenda";

type UseAgendaActionsParams = {
  assinaturaBloqueada: boolean;
  config: ConfigSalao | null;
  abrirAviso: (
    title: string,
    message: string,
    tone?: AgendaPageTone,
    redirectTo?: string | null
  ) => void;
  setSelectedDate: (value: string) => void;
  setSelectedTime: (value: string) => void;
  setEditingItem: (value: Agendamento | null) => void;
  setEditingBlock: (value: Bloqueio | null) => void;
  setModalMode: (value: "agendamento" | "bloqueio") => void;
  setModalOpen: (value: boolean) => void;
  setSelectedBlockEndTime: (value: string) => void;
  setSelectedBlockReason: (value: string) => void;
  setSlotActionOpen: (value: boolean) => void;
};

export function useAgendaActions({
  assinaturaBloqueada,
  config,
  abrirAviso,
  setSelectedDate,
  setSelectedTime,
  setEditingItem,
  setEditingBlock,
  setModalMode,
  setModalOpen,
  setSelectedBlockEndTime,
  setSelectedBlockReason,
  setSlotActionOpen,
}: UseAgendaActionsParams) {
  const bloquearSeAssinaturaInvalida = useCallback(() => {
    if (!assinaturaBloqueada) return false;

    abrirAviso(
      "Assinatura bloqueada",
      "Sua assinatura estÃ¡ bloqueada por atraso. Regularize o pagamento para continuar usando a agenda.",
      "danger",
      "/assinatura"
    );

    return true;
  }, [assinaturaBloqueada, abrirAviso]);

  const validarDiaFuncionamento = useCallback(
    (date: string) => {
      if (!ensureDiaFuncionamento({ config, dateString: date })) {
        abrirAviso(
          "Dia indisponÃ­vel",
          "Esse dia nÃ£o estÃ¡ configurado como dia de funcionamento.",
          "warning"
        );
        return false;
      }

      return true;
    },
    [abrirAviso, config]
  );

  const openSlotActions = useCallback(
    (date: string, time: string) => {
      if (bloquearSeAssinaturaInvalida()) return;
      if (!validarDiaFuncionamento(date)) return;

      setSelectedDate(date);
      setSelectedTime(time);
      setSlotActionOpen(true);
    },
    [
      bloquearSeAssinaturaInvalida,
      setSelectedDate,
      setSelectedTime,
      setSlotActionOpen,
      validarDiaFuncionamento,
    ]
  );

  const openCreateModal = useCallback(
    (date: string, time: string) => {
      if (bloquearSeAssinaturaInvalida()) return;
      if (!validarDiaFuncionamento(date)) return;

      setSlotActionOpen(false);
      setSelectedDate(date);
      setSelectedTime(time);
      setSelectedBlockEndTime(time);
      setSelectedBlockReason("");
      setEditingItem(null);
      setEditingBlock(null);
      setModalMode("agendamento");
      setModalOpen(true);
    },
    [
      bloquearSeAssinaturaInvalida,
      setEditingBlock,
      setEditingItem,
      setModalMode,
      setModalOpen,
      setSelectedBlockEndTime,
      setSelectedBlockReason,
      setSelectedDate,
      setSelectedTime,
      setSlotActionOpen,
      validarDiaFuncionamento,
    ]
  );

  const openBlockModal = useCallback(
    (
      date: string,
      time: string,
      preset?: { endTime?: string; reason?: string }
    ) => {
      if (bloquearSeAssinaturaInvalida()) return;
      if (!validarDiaFuncionamento(date)) return;

      setSlotActionOpen(false);
      setSelectedDate(date);
      setSelectedTime(time);
      setSelectedBlockEndTime(preset?.endTime || time);
      setSelectedBlockReason(preset?.reason || "");
      setEditingItem(null);
      setEditingBlock(null);
      setModalMode("bloqueio");
      setModalOpen(true);
    },
    [
      bloquearSeAssinaturaInvalida,
      setEditingBlock,
      setEditingItem,
      setModalMode,
      setModalOpen,
      setSelectedBlockEndTime,
      setSelectedBlockReason,
      setSelectedDate,
      setSelectedTime,
      setSlotActionOpen,
      validarDiaFuncionamento,
    ]
  );

  const openEditModal = useCallback(
    (item: Agendamento) => {
      if (bloquearSeAssinaturaInvalida()) return;

      setSlotActionOpen(false);
      setEditingItem(item);
      setEditingBlock(null);
      setModalMode("agendamento");
      setModalOpen(true);
    },
    [
      bloquearSeAssinaturaInvalida,
      setEditingBlock,
      setEditingItem,
      setModalMode,
      setModalOpen,
      setSlotActionOpen,
    ]
  );

  const handleEditBlock = useCallback(
    (block: Bloqueio) => {
      if (bloquearSeAssinaturaInvalida()) return;

      setSlotActionOpen(false);
      setEditingItem(null);
      setEditingBlock(block);
      setModalMode("bloqueio");
      setModalOpen(true);
    },
    [
      bloquearSeAssinaturaInvalida,
      setEditingBlock,
      setEditingItem,
      setModalMode,
      setModalOpen,
      setSlotActionOpen,
    ]
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingItem(null);
    setEditingBlock(null);
    setSelectedBlockEndTime("");
    setSelectedBlockReason("");
  }, [
    setEditingBlock,
    setEditingItem,
    setModalOpen,
    setSelectedBlockEndTime,
    setSelectedBlockReason,
  ]);

  return {
    bloquearSeAssinaturaInvalida,
    openSlotActions,
    openCreateModal,
    openBlockModal,
    openEditModal,
    handleEditBlock,
    closeModal,
  };
}
