"use client";

import type { AgendaPageNoticeState } from "./page-types";

type Props = {
  modal: AgendaPageNoticeState;
  onClose: () => void;
};

export default function AgendaNoticeDialog({ modal, onClose }: Props) {
  if (!modal.open) return null;

  const toneClasses =
    modal.tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : modal.tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-zinc-200 bg-zinc-50 text-zinc-700";

  return (
    <div className="fixed inset-0 z-[520] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
        <div className={`rounded-2xl border px-4 py-4 ${toneClasses}`}>
          <div className="text-lg font-bold">{modal.title}</div>
          <div className="mt-2 text-sm leading-6">{modal.message}</div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
