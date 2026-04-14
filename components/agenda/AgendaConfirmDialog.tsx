"use client";

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
      ? "bg-red-600 hover:bg-red-500"
      : modal.tone === "warning"
      ? "bg-amber-600 hover:bg-amber-500"
      : "bg-zinc-950 hover:bg-zinc-800";

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="text-lg font-bold text-zinc-950">{modal.title}</div>
        <div className="mt-2 text-sm leading-6 text-zinc-600">{modal.message}</div>

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
            className={`rounded-2xl px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-60 ${confirmToneButton}`}
          >
            {loading ? "Processando..." : modal.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
