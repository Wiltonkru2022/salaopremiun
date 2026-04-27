"use client";

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
    <div className="fixed inset-0 z-[540] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="text-lg font-bold text-zinc-950">{modal.title}</div>
        <div className="mt-2 text-sm leading-6 text-zinc-600">{modal.message}</div>

        <textarea
          value={modal.value}
          onChange={(e) => onChangeValue(e.target.value)}
          placeholder="Digite o motivo..."
          className="mt-4 min-h-[120px] w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 outline-none"
        />

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
          >
            Fechar
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
          >
            {loading ? "Salvando..." : "Confirmar exclusão"}
          </button>
        </div>
      </div>
    </div>
  );
}
