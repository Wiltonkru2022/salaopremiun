"use client";

import { useState } from "react";
import type {
  AgendaPageConfirmState,
  AgendaPageNoticeState,
  AgendaPageReasonState,
  AgendaPageTone,
} from "./page-types";

const EMPTY_NOTICE: AgendaPageNoticeState = {
  open: false,
  title: "",
  message: "",
  tone: "default",
  redirectTo: null,
};

const EMPTY_CONFIRM: AgendaPageConfirmState = {
  open: false,
  title: "",
  message: "",
  confirmLabel: "Confirmar",
  tone: "default",
  onConfirm: null,
};

const EMPTY_REASON: AgendaPageReasonState = {
  open: false,
  title: "",
  message: "",
  value: "",
  onConfirm: null,
};

type UseAgendaFeedbackParams = {
  onRedirect?: (path: string) => void;
};

export function useAgendaFeedback({ onRedirect }: UseAgendaFeedbackParams = {}) {
  const [avisoModal, setAvisoModal] = useState<AgendaPageNoticeState>(EMPTY_NOTICE);
  const [confirmModal, setConfirmModal] = useState<AgendaPageConfirmState>(EMPTY_CONFIRM);
  const [motivoModal, setMotivoModal] = useState<AgendaPageReasonState>(EMPTY_REASON);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [motivoLoading, setMotivoLoading] = useState(false);

  function abrirAviso(
    title: string,
    message: string,
    tone: AgendaPageTone = "default",
    redirectTo?: string | null
  ) {
    setAvisoModal({
      open: true,
      title,
      message,
      tone,
      redirectTo: redirectTo || null,
    });
  }

  function fecharAviso() {
    const redirectTo = avisoModal.redirectTo;
    setAvisoModal(EMPTY_NOTICE);

    if (redirectTo) {
      onRedirect?.(redirectTo);
    }
  }

  function abrirConfirmacao(params: {
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: AgendaPageTone;
    onConfirm: () => Promise<void>;
  }) {
    setConfirmModal({
      open: true,
      title: params.title,
      message: params.message,
      confirmLabel: params.confirmLabel || "Confirmar",
      tone: params.tone || "default",
      onConfirm: params.onConfirm,
    });
  }

  function fecharConfirmacao() {
    setConfirmModal(EMPTY_CONFIRM);
  }

  async function executarConfirmacao() {
    if (!confirmModal.onConfirm) return;

    try {
      setConfirmLoading(true);
      await confirmModal.onConfirm();
      setConfirmModal(EMPTY_CONFIRM);
    } catch (error) {
      console.error(error);
      abrirAviso(
        "Não foi possível concluir",
        error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
        "danger"
      );
    } finally {
      setConfirmLoading(false);
    }
  }

  function abrirMotivoExclusao(params: {
    title: string;
    message: string;
    onConfirm: (value: string) => Promise<void>;
  }) {
    setMotivoModal({
      open: true,
      title: params.title,
      message: params.message,
      value: "",
      onConfirm: params.onConfirm,
    });
  }

  function setMotivoValor(value: string) {
    setMotivoModal((prev) => ({
      ...prev,
      value,
    }));
  }

  function fecharMotivo() {
    setMotivoModal(EMPTY_REASON);
  }

  async function executarMotivo() {
    if (!motivoModal.onConfirm) return;

    try {
      setMotivoLoading(true);
      await motivoModal.onConfirm(motivoModal.value);
      setMotivoModal(EMPTY_REASON);
    } catch (error) {
      console.error(error);
      abrirAviso(
        "Não foi possível concluir",
        error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
        "danger"
      );
    } finally {
      setMotivoLoading(false);
    }
  }

  return {
    avisoModal,
    confirmModal,
    motivoModal,
    confirmLoading,
    motivoLoading,
    abrirAviso,
    fecharAviso,
    abrirConfirmacao,
    fecharConfirmacao,
    executarConfirmacao,
    abrirMotivoExclusao,
    fecharMotivo,
    executarMotivo,
    setMotivoValor,
  };
}
