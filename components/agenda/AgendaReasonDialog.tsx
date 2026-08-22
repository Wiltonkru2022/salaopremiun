"use client";

import AppModal from "@/components/ui/AppModal";
import type { AgendaPageReasonState } from "./page-types";

type Props = {
  modal: AgendaPageReasonState;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onChangeValue: (value: string) => void;
};

export default function AgendaReasonDialog({
  modal,
  loading,
  onClose,
  onConfirm,
  onChangeValue,
}: Props) {
  if (!modal.open) return null;

  return (
    <AppModal
      open={modal.open}
      onClose={onClose}
      title={modal.title}
      description={modal.message}
      maxWidthClassName="max-w-md"
      zIndexClassName="z-[540]"
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
            className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-60"
          >
            {loading ? "Salvando..." : "Confirmar exclusao"}
          </button>
        </>
      }
    >
      <label className="block text-sm font-bold text-zinc-700">
        Motivo
        <textarea
          value={modal.value}
          onChange={(event) => onChangeValue(event.target.value)}
          placeholder="Digite o motivo..."
          className="mt-2 min-h-[120px] w-full rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm font-semibold text-zinc-700 outline-none transition focus:border-zinc-950 focus:bg-white"
        />
      </label>
    </AppModal>
  );
}
