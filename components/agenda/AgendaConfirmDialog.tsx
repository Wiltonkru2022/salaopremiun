"use client";

import AppModal from "@/components/ui/AppModal";
import type { AgendaPageConfirmState } from "./page-types";

type Props = {
  modal: AgendaPageConfirmState;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export default function AgendaConfirmDialog({
  modal,
  loading,
  onClose,
  onConfirm,
}: Props) {
  if (!modal.open) return null;

  const confirmToneButton =
    modal.tone === "danger"
      ? "bg-rose-600 hover:bg-rose-700"
      : modal.tone === "warning"
        ? "bg-amber-600 hover:bg-amber-700"
        : "bg-zinc-950 hover:bg-zinc-800";

  return (
    <AppModal
      open={modal.open}
      onClose={onClose}
      title={modal.title}
      description={modal.message}
      maxWidthClassName="max-w-md"
      zIndexClassName="z-[530]"
      closeDisabled={loading}
      closeOnBackdropClick={!loading}
      footer={
        <>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
          >
            Fechar
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-bold text-white transition disabled:opacity-60 ${confirmToneButton}`}
          >
            {loading ? "Processando..." : modal.confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-6 text-zinc-600">
        Confirme para aplicar esta acao na agenda.
      </p>
    </AppModal>
  );
}
